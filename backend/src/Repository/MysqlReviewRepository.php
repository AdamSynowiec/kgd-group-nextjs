<?php

declare(strict_types=1);

namespace App\Repository;

use JsonException;
use PDO;
use RuntimeException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Tabele akceptacji zmian (db/042_page_review.sql): wersje zatwierdzone stron (page_approved),
 * historia zmian pól (page_changes) i prośby o weryfikację (review_requests). Logika — PageReview.php.
 */
final class MysqlReviewRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    // ----- wersje zatwierdzone -----

    /** @return array{exists: bool, content: ?array<string, mixed>} */
    public function approved(string $slug): array
    {
        $statement = $this->pdo->prepare('SELECT content FROM page_approved WHERE slug = :slug');
        $statement->execute(['slug' => $slug]);
        $row = $statement->fetch();

        return $row === false ? ['exists' => false, 'content' => null] : ['exists' => true, 'content' => $this->decode($row['content'])];
    }

    /** @return array<string, ?array<string, mixed>> slug => wersja zatwierdzona (null = nowa strona, jeszcze niezatwierdzona) */
    public function allApproved(): array
    {
        $result = [];
        foreach ($this->pdo->query('SELECT slug, content FROM page_approved ORDER BY created_at, slug') as $row) {
            $result[(string) $row['slug']] = $this->decode($row['content']);
        }

        return $result;
    }

    /** Zapamiętuje wersję zatwierdzoną, jeśli strona jeszcze jej nie ma (pierwsza niezatwierdzona zmiana). */
    public function keepApproved(string $slug, ?array $content): void
    {
        $statement = $this->pdo->prepare('INSERT IGNORE INTO page_approved (slug, content) VALUES (:slug, :content)');
        $statement->execute(['slug' => $slug, 'content' => $content === null ? null : $this->encode($content)]);
    }

    public function updateApproved(string $slug, ?array $content): void
    {
        $statement = $this->pdo->prepare('UPDATE page_approved SET content = :content WHERE slug = :slug');
        $statement->execute(['slug' => $slug, 'content' => $content === null ? null : $this->encode($content)]);
    }

    public function forgetApproved(string $slug): void
    {
        $this->pdo->prepare('DELETE FROM page_approved WHERE slug = :slug')->execute(['slug' => $slug]);
    }

    // ----- historia zmian -----

    public function logChange(string $slug, string $key, string $label, mixed $old, mixed $new, ?int $userId, ?string $login, string $status = 'pending', ?string $resolvedBy = null): void
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO page_changes (slug, field_key, label, old_value, new_value, user_id, login, status, resolved_at, resolved_by) '
            . 'VALUES (:slug, :field_key, :label, :old_value, :new_value, :user_id, :login, :status, '
            . "IF(:status2 = 'pending', NULL, CURRENT_TIMESTAMP), :resolved_by)"
        );
        $statement->execute([
            'slug' => $slug,
            'field_key' => $key,
            'label' => mb_substr($label, 0, 250),
            'old_value' => $this->encode($old),
            'new_value' => $this->encode($new),
            'user_id' => $userId,
            'login' => $login,
            'status' => $status,
            'status2' => $status,
            'resolved_by' => $resolvedBy,
        ]);
    }

    /**
     * Rozstrzyga oczekujące zmiany: jednego pola ($key), całej strony ($key null) albo
     * wszystkich ($slug null). $onlyKeysNotIn — tylko pola spoza tej listy (np. zmiany cofnięte
     * ręcznie przez samego edytora). @return int liczba zmienionych wierszy
     *
     * @param list<string>|null $onlyKeysNotIn
     */
    public function resolve(?string $slug, ?string $key, string $status, ?string $by, ?array $onlyKeysNotIn = null): int
    {
        $sql = "UPDATE page_changes SET status = :status, resolved_at = CURRENT_TIMESTAMP, resolved_by = :by WHERE status = 'pending'";
        $params = ['status' => $status, 'by' => $by];
        if ($slug !== null) {
            $sql .= ' AND slug = :slug';
            $params['slug'] = $slug;
        }
        if ($key !== null) {
            $sql .= ' AND field_key = :field_key';
            $params['field_key'] = $key;
        }
        if ($onlyKeysNotIn !== null && $onlyKeysNotIn !== []) {
            $placeholders = [];
            foreach (array_values($onlyKeysNotIn) as $index => $value) {
                $placeholders[] = ":k{$index}";
                $params["k{$index}"] = $value;
            }
            $sql .= ' AND field_key NOT IN (' . implode(', ', $placeholders) . ')';
        }
        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);

        return $statement->rowCount();
    }

    /** @return list<array{id: int, slug: string, key: string, label: string, old: mixed, new: mixed, userId: ?int, login: ?string, status: string, createdAt: string, resolvedAt: ?string, resolvedBy: ?string}> */
    public function changes(?string $status = 'pending', int $limit = 500, ?string $slug = null): array
    {
        $sql = 'SELECT * FROM page_changes WHERE 1 = 1';
        $params = [];
        if ($status !== null) {
            $sql .= ' AND status = :status';
            $params['status'] = $status;
        } else {
            $sql .= " AND status <> 'pending'";
        }
        if ($slug !== null) {
            $sql .= ' AND slug = :slug';
            $params['slug'] = $slug;
        }
        $sql .= ' ORDER BY ' . ($status === 'pending' ? 'created_at ASC, id ASC' : 'COALESCE(resolved_at, created_at) DESC, id DESC') . ' LIMIT ' . max(1, min($limit, 2000));
        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);

        $rows = [];
        foreach ($statement as $row) {
            $rows[] = [
                'id' => (int) $row['id'],
                'slug' => (string) $row['slug'],
                'key' => (string) $row['field_key'],
                'label' => (string) $row['label'],
                'old' => $this->decodeValue($row['old_value']),
                'new' => $this->decodeValue($row['new_value']),
                'userId' => $row['user_id'] === null ? null : (int) $row['user_id'],
                'login' => $row['login'] === null ? null : (string) $row['login'],
                'status' => (string) $row['status'],
                'createdAt' => (string) $row['created_at'],
                'resolvedAt' => $row['resolved_at'] === null ? null : (string) $row['resolved_at'],
                'resolvedBy' => $row['resolved_by'] === null ? null : (string) $row['resolved_by'],
            ];
        }

        return $rows;
    }

    public function pendingCountFor(int $userId): int
    {
        $statement = $this->pdo->prepare("SELECT COUNT(DISTINCT slug, field_key) FROM page_changes WHERE status = 'pending' AND user_id = :user_id");
        $statement->execute(['user_id' => $userId]);

        return (int) $statement->fetchColumn();
    }

    // ----- prośby o weryfikację -----

    /** Nowa prośba albo odświeżenie otwartej (jedna otwarta na osobę). @return int id prośby */
    public function request(?int $userId, string $login, string $message): int
    {
        $open = $this->pdo->prepare("SELECT id FROM review_requests WHERE status = 'open' AND login = :login ORDER BY id DESC LIMIT 1");
        $open->execute(['login' => $login]);
        $id = $open->fetchColumn();
        if ($id !== false) {
            $this->pdo->prepare('UPDATE review_requests SET message = :message, created_at = CURRENT_TIMESTAMP WHERE id = :id')
                ->execute(['message' => $message, 'id' => $id]);

            return (int) $id;
        }
        $this->pdo->prepare('INSERT INTO review_requests (user_id, login, message) VALUES (:user_id, :login, :message)')
            ->execute(['user_id' => $userId, 'login' => $login, 'message' => $message]);

        return (int) $this->pdo->lastInsertId();
    }

    /** Zamyka otwarte prośby osób, które nie mają już żadnej oczekującej zmiany. */
    public function closeResolvedRequests(?string $by): void
    {
        $this->pdo->prepare(
            "UPDATE review_requests r SET r.status = 'done', r.resolved_at = CURRENT_TIMESTAMP, r.resolved_by = :by "
            . "WHERE r.status = 'open' AND NOT EXISTS (SELECT 1 FROM page_changes c WHERE c.status = 'pending' AND c.login = r.login)"
        )->execute(['by' => $by]);
    }

    /** @return list<array{id: int, userId: ?int, login: string, message: string, status: string, createdAt: string, resolvedAt: ?string, resolvedBy: ?string}> */
    public function requests(string $status = 'open', int $limit = 50): array
    {
        $statement = $this->pdo->prepare('SELECT * FROM review_requests WHERE status = :status ORDER BY created_at DESC LIMIT ' . max(1, min($limit, 500)));
        $statement->execute(['status' => $status]);
        $rows = [];
        foreach ($statement as $row) {
            $rows[] = [
                'id' => (int) $row['id'],
                'userId' => $row['user_id'] === null ? null : (int) $row['user_id'],
                'login' => (string) $row['login'],
                'message' => (string) ($row['message'] ?? ''),
                'status' => (string) $row['status'],
                'createdAt' => (string) $row['created_at'],
                'resolvedAt' => $row['resolved_at'] === null ? null : (string) $row['resolved_at'],
                'resolvedBy' => $row['resolved_by'] === null ? null : (string) $row['resolved_by'],
            ];
        }

        return $rows;
    }

    /** @return array{id: int, message: string, createdAt: string}|null */
    public function openRequestOf(string $login): ?array
    {
        $statement = $this->pdo->prepare("SELECT id, message, created_at FROM review_requests WHERE status = 'open' AND login = :login ORDER BY id DESC LIMIT 1");
        $statement->execute(['login' => $login]);
        $row = $statement->fetch();

        return $row === false ? null : ['id' => (int) $row['id'], 'message' => (string) ($row['message'] ?? ''), 'createdAt' => (string) $row['created_at']];
    }

    // -----

    private function encode(mixed $value): string
    {
        try {
            return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION | JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new RuntimeException('Nie udało się zakodować JSON-a.', previous: $exception);
        }
    }

    /** @return array<string, mixed>|null */
    private function decode(?string $json): ?array
    {
        if ($json === null) {
            return null;
        }
        $decoded = json_decode($json, true);

        return is_array($decoded) ? $decoded : null;
    }

    private function decodeValue(?string $json): mixed
    {
        return $json === null ? null : json_decode($json, true);
    }
}
