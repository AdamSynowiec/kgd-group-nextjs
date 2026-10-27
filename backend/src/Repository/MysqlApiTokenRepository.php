<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Tokeny REST API v1 (tabela api_tokens, db/037_create_api_tokens.sql).
 *
 * Token: "kgd_" + 48 znaków hex (192 bity losowości). Pełna wartość istnieje tylko w odpowiedzi
 * na utworzenie — w bazie jest sha256 (porównanie stałoczasowe nie jest potrzebne: szukamy po
 * hashu w unikalnym indeksie, a hash nie zdradza tokenu) i prefiks do rozpoznania w panelu.
 *
 * Kształt rekordu: {id, name, prefix, scopes, createdBy, createdAt, expiresAt, lastUsedAt, revokedAt}.
 */
final class MysqlApiTokenRepository
{
    public const TOKEN_PREFIX = 'kgd_';

    public function __construct(private readonly PDO $pdo)
    {
    }

    /**
     * @param string[] $scopes
     * @return array{token: string, record: array<string, mixed>} token — jedyny moment, w którym jest znany
     */
    public function create(string $name, array $scopes, ?int $expiresAt, ?string $createdBy): array
    {
        $token = self::TOKEN_PREFIX . bin2hex(random_bytes(24));
        $this->pdo->prepare(
            'INSERT INTO api_tokens (name, prefix, token_hash, scopes, created_by, expires_at) '
            . 'VALUES (:name, :prefix, :hash, :scopes, :by, IF(:expires IS NULL, NULL, FROM_UNIXTIME(:expires2)))'
        )->execute([
            'name' => $name,
            'prefix' => substr($token, 0, 12),
            'hash' => hash('sha256', $token),
            'scopes' => json_encode(array_values($scopes)),
            'by' => $createdBy,
            'expires' => $expiresAt,
            'expires2' => $expiresAt,
        ]);

        return ['token' => $token, 'record' => $this->find((int) $this->pdo->lastInsertId())];
    }

    /** @return list<array<string, mixed>> */
    public function all(): array
    {
        return array_map([self::class, 'map'], $this->pdo->query(self::SELECT . ' ORDER BY id DESC')->fetchAll(PDO::FETCH_ASSOC));
    }

    /** @return array<string, mixed>|null */
    public function find(int $id): ?array
    {
        $statement = $this->pdo->prepare(self::SELECT . ' WHERE id = :id');
        $statement->execute(['id' => $id]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        return $row === false ? null : self::map($row);
    }

    /** Ważny token (nie cofnięty, nie wygasły) o podanej wartości — albo null. */
    public function findActiveByToken(string $token): ?array
    {
        if (!str_starts_with($token, self::TOKEN_PREFIX)) {
            return null;
        }
        $statement = $this->pdo->prepare(
            self::SELECT . ' WHERE token_hash = :hash AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())'
        );
        $statement->execute(['hash' => hash('sha256', $token)]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        return $row === false ? null : self::map($row);
    }

    /** Ostatnie użycie — zapis najwyżej raz na minutę na token, żeby nie pisać do bazy przy każdym zapytaniu. */
    public function touch(int $id): void
    {
        $this->pdo->prepare(
            'UPDATE api_tokens SET last_used_at = NOW() WHERE id = :id AND (last_used_at IS NULL OR last_used_at < NOW() - INTERVAL 1 MINUTE)'
        )->execute(['id' => $id]);
    }

    public function revoke(int $id): bool
    {
        $statement = $this->pdo->prepare('UPDATE api_tokens SET revoked_at = NOW() WHERE id = :id AND revoked_at IS NULL');
        $statement->execute(['id' => $id]);

        return $statement->rowCount() > 0;
    }

    private const SELECT = 'SELECT id, name, prefix, scopes, created_by, UNIX_TIMESTAMP(created_at) AS created_ts, '
        . 'UNIX_TIMESTAMP(expires_at) AS expires_ts, UNIX_TIMESTAMP(last_used_at) AS used_ts, UNIX_TIMESTAMP(revoked_at) AS revoked_ts FROM api_tokens';

    /** @param array<string, mixed> $row */
    private static function map(array $row): array
    {
        $date = static fn (mixed $ts): ?string => $ts === null ? null : gmdate('Y-m-d\TH:i:s\Z', (int) $ts);
        $scopes = json_decode((string) $row['scopes'], true);

        return [
            'id' => (int) $row['id'],
            'name' => (string) $row['name'],
            'prefix' => (string) $row['prefix'],
            'scopes' => is_array($scopes) ? array_values(array_map('strval', $scopes)) : [],
            'createdBy' => $row['created_by'] !== null ? (string) $row['created_by'] : null,
            'createdAt' => $date($row['created_ts']),
            'expiresAt' => $date($row['expires_ts']),
            'lastUsedAt' => $date($row['used_ts']),
            'revokedAt' => $date($row['revoked_ts']),
        ];
    }
}
