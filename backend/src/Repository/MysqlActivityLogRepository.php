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

    private function clientIp(): ?string
    {
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null;

        if (!is_string($ip) || $ip === '') {
            return null;
        }

        // Za proxy X-Forwarded-For bywa listą "klient, proxy1, proxy2" — pierwszy wpis to realny klient.
        return trim(explode(',', $ip)[0]);
    }
}
