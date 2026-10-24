<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;
use PDOException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Blokady edycji stron (tabela page_locks, db/029_create_page_locks.sql).
 *
 * Świeżość liczona czasem BAZY (NOW()), nie PHP ani przeglądarki — jeden zegar dla
 * wszystkich. Blokada bez odnowienia przez TTL_SECONDS jest traktowana jak wolna.
 *
 * Kształt "holder": {lockId, userId, login, acquiredAt, heartbeatAt} — daty w ISO 8601.
 */
final class MysqlPageLockRepository
{
    public const TTL_SECONDS = 60;

    public function __construct(private readonly PDO $pdo)
    {
    }

    /** @return array{lockId: string, userId: ?int, login: string, acquiredAt: string, heartbeatAt: string}|null aktywna blokada strony albo null */
    public function current(string $slug): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT lock_id, user_id, login, UNIX_TIMESTAMP(acquired_at) AS acquired_ts, UNIX_TIMESTAMP(heartbeat_at) AS heartbeat_ts FROM page_locks '
            . 'WHERE slug = :slug AND heartbeat_at > (NOW() - INTERVAL ' . self::TTL_SECONDS . ' SECOND)'
        );
        $statement->execute(['slug' => $slug]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        return $row === false ? null : self::map($row);
    }

    /**
     * Zajmuje stronę dla $lockId. Gdy aktywną blokadę ma inne otwarcie edytora i nie ma
     * $force — nic nie zmienia i zwraca dotychczasowego właściciela.
     *
     * Bez SELECT ... FOR UPDATE: na nieistniejącym wierszu InnoDB zakłada blokady luk i dwa
     * równoczesne "Edytuj" kończyły się deadlockiem. Zamiast tego dwa atomowe kroki:
     *   1) INSERT — udaje się tylko, gdy strona nie ma żadnego wiersza blokady,
     *   2) warunkowy UPDATE — przejmuje wiersz tylko, gdy to nasza blokada, wygasła albo $force.
     * Wynik zawsze odczytany z bazy po zapisie (kto faktycznie trzyma stronę).
     *
     * @return array{acquired: bool, holder: ?array, previous: ?array} previous = przejęta cudza, aktywna blokada (przy $force)
     */
    public function acquire(string $slug, string $lockId, ?int $userId, string $login, bool $force): array
    {
        for ($attempt = 1; ; $attempt++) {
            try {
                return $this->tryAcquire($slug, $lockId, $userId, $login, $force);
            } catch (PDOException $exception) {
                // 40001 = deadlock / serialization failure — przy dwóch kliknięciach naraz; ponów.
                if ($exception->getCode() !== '40001' || $attempt >= 3) {
                    throw $exception;
                }
                usleep(random_int(5000, 30000));
            }
        }
    }

    /** @return array{acquired: bool, holder: ?array, previous: ?array} */
    private function tryAcquire(string $slug, string $lockId, ?int $userId, string $login, bool $force): array
    {
        $before = $this->current($slug);

        try {
            $this->pdo->prepare(
                'INSERT INTO page_locks (slug, lock_id, user_id, login, acquired_at, heartbeat_at) '
                . 'VALUES (:slug, :lockId, :userId, :login, NOW(), NOW())'
            )->execute(['slug' => $slug, 'lockId' => $lockId, 'userId' => $userId, 'login' => $login]);
        } catch (PDOException $exception) {
            if ($exception->getCode() !== '23000') { // 23000 = wiersz już jest (duplikat klucza)
                throw $exception;
            }
            // acquired_at jako PIERWSZE w SET — porównuje jeszcze starą wartość lock_id.
            $this->pdo->prepare(
                'UPDATE page_locks SET '
                . 'acquired_at = IF(lock_id = :sameLock, acquired_at, NOW()), '
                . 'lock_id = :lockId, user_id = :userId, login = :login, heartbeat_at = NOW() '
                . 'WHERE slug = :slug AND (lock_id = :ownLock OR heartbeat_at <= (NOW() - INTERVAL ' . self::TTL_SECONDS . ' SECOND) OR :force = 1)'
            )->execute([
                'sameLock' => $lockId,
                'lockId' => $lockId,
                'userId' => $userId,
                'login' => $login,
                'slug' => $slug,
                'ownLock' => $lockId,
                'force' => $force ? 1 : 0,
            ]);
        }

        $holder = $this->current($slug);
        $acquired = $holder !== null && $holder['lockId'] === $lockId;
        $previous = $acquired && $before !== null && $before['lockId'] !== $lockId ? $before : null;

        return ['acquired' => $acquired, 'holder' => $holder, 'previous' => $previous];
    }

    /**
     * Odnawia blokadę $lockId. Gdy wygasła (np. uśpiony komputer), a nikt jej nie zajął —
     * odzyskuje ją. Zwraca null, gdy $lockId trzyma stronę; w przeciwnym razie aktualnego
     * właściciela (ktoś przejął edycję).
     *
     * @return array{lockId: string, userId: ?int, login: string, acquiredAt: string, heartbeatAt: string}|null
     */
    public function heartbeat(string $slug, string $lockId, ?int $userId, string $login): ?array
    {
        $result = $this->acquire($slug, $lockId, $userId, $login, false);

        return $result['acquired'] ? null : $result['holder'];
    }

    public function release(string $slug, string $lockId): void
    {
        $this->pdo->prepare('DELETE FROM page_locks WHERE slug = :slug AND lock_id = :lockId')
            ->execute(['slug' => $slug, 'lockId' => $lockId]);
    }

    /** @return list<array{slug: string, lockId: string, userId: ?int, login: string, acquiredAt: string, heartbeatAt: string}> */
    public function listActive(): array
    {
        // Przy okazji sprzątamy martwe blokady — tabela nie rośnie bez końca.
        $this->pdo->exec('DELETE FROM page_locks WHERE heartbeat_at < (NOW() - INTERVAL 1 DAY)');

        $statement = $this->pdo->query(
            'SELECT slug, lock_id, user_id, login, UNIX_TIMESTAMP(acquired_at) AS acquired_ts, UNIX_TIMESTAMP(heartbeat_at) AS heartbeat_ts FROM page_locks '
            . 'WHERE heartbeat_at > (NOW() - INTERVAL ' . self::TTL_SECONDS . ' SECOND) ORDER BY slug'
        );

        $locks = [];
        foreach ($statement->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $locks[] = ['slug' => (string) $row['slug']] + self::map($row);
        }

        return $locks;
    }

    /**
     * @param array<string, mixed> $row
     * @return array{lockId: string, userId: ?int, login: string, acquiredAt: string, heartbeatAt: string}
     */
    private static function map(array $row): array
    {
        return [
            'lockId' => (string) $row['lock_id'],
            'userId' => $row['user_id'] === null ? null : (int) $row['user_id'],
            'login' => (string) $row['login'],
            // UNIX_TIMESTAMP w SQL — niezależne od strefy czasowej serwera MySQL i PHP.
            'acquiredAt' => gmdate('Y-m-d\TH:i:s\Z', (int) $row['acquired_ts']),
            'heartbeatAt' => gmdate('Y-m-d\TH:i:s\Z', (int) $row['heartbeat_ts']),
        ];
    }
}
