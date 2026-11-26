<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;
use Throwable;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/** Implementacja ActivityLogRepositoryInterface na tabeli "activity_log" (patrz db/013_create_activity_log.sql). */
final class MysqlActivityLogRepository implements ActivityLogRepositoryInterface
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    /**
     * Celowo NIGDY nie rzuca — logowanie jest efektem UBOCZNYM realnej
     * operacji (zapis strony, usunięcie konta, ...), nie warunkiem jej
     * powodzenia. Bez tego przejściowy błąd zapisu do activity_log (albo,
     * dla BuildController::trigger(), sama baza akurat nieodpowiadająca —
     * patrz jego komentarz) zamieniałby UDANĄ operację w błąd 500 tylko
     * dlatego, że nie udało się jej zanotować. Błąd trafia do error_log()
     * serwera, żeby nie zniknął całkiem bezśladowo.
     */
    public function log(?int $userId, ?string $login, string $action, ?string $target = null, ?array $details = null): void
    {
        try {
            $statement = $this->pdo->prepare(
                'INSERT INTO activity_log (user_id, login, action, target, details, ip_address) '
                . 'VALUES (:userId, :login, :action, :target, :details, :ipAddress)'
            );
            $statement->execute([
                'userId' => $userId,
                'login' => $login,
                'action' => $action,
                'target' => $target,
                'details' => $details !== null ? json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null,
                'ipAddress' => $this->clientIp(),
            ]);
        } catch (Throwable $exception) {
            error_log('[activity_log] nie udało się zapisać zdarzenia "' . $action . '": ' . $exception->getMessage());
        }
    }

    public function list(int $limit, int $offset): array
    {
        $statement = $this->pdo->prepare(
            'SELECT id, user_id, login, action, target, details, ip_address, created_at '
            . 'FROM activity_log ORDER BY id DESC LIMIT :limit OFFSET :offset'
        );
        $statement->bindValue('limit', $limit, PDO::PARAM_INT);
        $statement->bindValue('offset', $offset, PDO::PARAM_INT);
        $statement->execute();

        return array_map(static function (array $row): array {
            return [
                'id' => (int) $row['id'],
                'userId' => $row['user_id'] !== null ? (int) $row['user_id'] : null,
                'login' => $row['login'] !== null ? (string) $row['login'] : null,
                'action' => (string) $row['action'],
                'target' => $row['target'] !== null ? (string) $row['target'] : null,
                'details' => $row['details'] !== null ? json_decode((string) $row['details'], true) : null,
                'ipAddress' => $row['ip_address'] !== null ? (string) $row['ip_address'] : null,
                'createdAt' => (string) $row['created_at'],
            ];
        }, $statement->fetchAll());
    }

    public function count(): int
    {
        $statement = $this->pdo->query('SELECT COUNT(*) FROM activity_log');

        return (int) $statement->fetchColumn();
    }

    public function pagesChangedSinceBuild(array $coveringBuilds): array
    {
        $since = null;
        $lastId = 0;
        if ($coveringBuilds !== []) {
            $placeholders = implode(',', array_fill(0, count($coveringBuilds), '?'));
            $statement = $this->pdo->prepare("SELECT id, created_at FROM activity_log WHERE action IN ({$placeholders}) ORDER BY id DESC LIMIT 1");
            $statement->execute(array_values($coveringBuilds));
            $row = $statement->fetch();
            if ($row) {
                $lastId = (int) $row['id'];
                $since = (string) $row['created_at'];
            }
        }

        // Zmiany treści, które trafiają na stronę: zapis strony, nowa strona, zatwierdzenie/cofnięcie zmian edytora.
        $statement = $this->pdo->prepare(
            "SELECT id, target, login, created_at FROM activity_log WHERE id > :lastId "
            . "AND action IN ('pages.update', 'pages.create', 'changes.approve', 'changes.revert') "
            . "AND target LIKE '/%' ORDER BY id DESC LIMIT 500"
        );
        $statement->bindValue('lastId', $lastId, PDO::PARAM_INT);
        $statement->execute();

        $pages = [];
        foreach ($statement->fetchAll() as $row) {
            $slug = (string) $row['target'];
            if (isset($pages[$slug])) {
                continue; // najnowsza zmiana wygrywa (sortowanie malejąco)
            }
            $pages[$slug] = ['slug' => $slug, 'changedAt' => (string) $row['created_at'], 'login' => $row['login'] !== null ? (string) $row['login'] : null];
        }

        return ['since' => $since, 'pages' => array_values($pages)];
    }

    public function countRecentFromClient(string $action, int $seconds, ?string $login = null): int
    {
        $ip = $this->clientIp();
        if ($ip === null) {
            return 0;
        }

        $statement = $this->pdo->prepare(
            'SELECT COUNT(*) FROM activity_log WHERE action = :action AND ip_address = :ip '
            . 'AND created_at > DATE_SUB(CURRENT_TIMESTAMP, INTERVAL :seconds SECOND)'
            . ($login !== null ? ' AND login = :login' : '')
        );
        $statement->execute(['action' => $action, 'ip' => $ip, 'seconds' => $seconds] + ($login !== null ? ['login' => $login] : []));

        return (int) $statement->fetchColumn();
    }

    /**
     * Wyłącznie REMOTE_ADDR — X-Forwarded-For ustawia klient, więc dało się nim podać dowolny adres
     * (serwer stoi bez proxy przed sobą). Za proxy/CDN trzeba by ufać nagłówkowi tylko od jego adresów.
     */
    private function clientIp(): ?string
    {
        $ip = $_SERVER['REMOTE_ADDR'] ?? null;

        return is_string($ip) && $ip !== '' ? $ip : null;
    }
}
