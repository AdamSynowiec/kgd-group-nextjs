<?php

declare(strict_types=1);

namespace App\Repository;

use App\Exception\NotFoundException;
use App\Support\Editable;
use JsonException;
use PDO;
use RuntimeException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/** Implementacja CollectionItemRepositoryInterface na tabeli "collection_items" (patrz db/007_create_collection_items_table.sql). */
final class MysqlCollectionItemRepository implements CollectionItemRepositoryInterface
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function findBySlug(string $collection, string $slug): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT slug, content, status, published_at, updated_at FROM collection_items '
            . 'WHERE collection = :collection AND slug = :slug LIMIT 1'
        );
        $statement->execute(['collection' => $collection, 'slug' => $slug]);
        $row = $statement->fetch();

        if ($row === false) {
            return null;
        }

        return $this->mapRow($row);
    }

    public function listAll(string $collection): array
    {
        $statement = $this->pdo->prepare(
            'SELECT slug, content, status, published_at, updated_at FROM collection_items '
            . 'WHERE collection = :collection ORDER BY updated_at DESC'
        );
        $statement->execute(['collection' => $collection]);

        $items = [];
        foreach ($statement as $row) {
            $content = $this->decode($row['content']);
            $items[] = [
                'slug' => $row['slug'],
                'title' => (string) (Editable::unwrap($content['title'] ?? null) ?? $row['slug']),
                'status' => (string) $row['status'],
                'publishedAt' => $row['published_at'],
                'updatedAt' => $row['updated_at'],
            ];
        }

        return $items;
    }

    public function listPublished(string $collection, int $limit, int $offset): array
    {
        $statement = $this->pdo->prepare(
            'SELECT slug, content, published_at FROM collection_items '
            . "WHERE collection = :collection AND status = 'published' "
            . 'ORDER BY published_at DESC, id DESC LIMIT :limit OFFSET :offset'
        );
        $statement->bindValue('collection', $collection, PDO::PARAM_STR);
        $statement->bindValue('limit', $limit, PDO::PARAM_INT);
        $statement->bindValue('offset', $offset, PDO::PARAM_INT);
        $statement->execute();

        $items = [];
        foreach ($statement as $row) {
            $items[] = [
                'slug' => $row['slug'],
                'content' => $this->decode($row['content']),
                'publishedAt' => $row['published_at'],
            ];
        }

        return $items;
    }

    public function countPublished(string $collection): int
    {
        $statement = $this->pdo->prepare(
            "SELECT COUNT(*) FROM collection_items WHERE collection = :collection AND status = 'published'"
        );
        $statement->execute(['collection' => $collection]);

        return (int) $statement->fetchColumn();
    }

    public function create(string $collection, string $slug, array $content): array
    {
        $statement = $this->pdo->prepare(
            "INSERT INTO collection_items (collection, slug, content, status, published_at) "
            . "VALUES (:collection, :slug, :content, 'draft', NULL)"
        );
        $statement->execute([
            'collection' => $collection,
            'slug' => $slug,
            'content' => $this->encode($content),
        ]);

        return [
            'slug' => $slug,
            'content' => $content,
            'status' => 'draft',
            'publishedAt' => null,
            'updatedAt' => (new \DateTimeImmutable())->format('Y-m-d H:i:s'),
        ];
    }

    public function save(string $collection, string $slug, array $content, string $status, ?string $publishedAt): void
    {
        $statement = $this->pdo->prepare(
            'UPDATE collection_items SET content = :content, status = :status, published_at = :published_at '
            . 'WHERE collection = :collection AND slug = :slug'
        );
        $statement->execute([
            'collection' => $collection,
            'slug' => $slug,
            'content' => $this->encode($content),
            'status' => $status,
            'published_at' => $publishedAt,
        ]);

        // PDO::MYSQL_ATTR_FOUND_ROWS jest ustawione globalnie (patrz Connection::get()) —
        // rowCount() liczy wiersze DOPASOWANE przez WHERE, nie tylko faktycznie
        // zmienione, więc 0 tu jednoznacznie znaczy "nie znaleziono", nie "zapis identycznej treści".
        if ($statement->rowCount() === 0) {
            throw new NotFoundException("Nie znaleziono elementu kolekcji \"{$collection}\" do zapisania: {$slug}");
        }
    }

    public function delete(string $collection, string $slug): void
    {
        $statement = $this->pdo->prepare('DELETE FROM collection_items WHERE collection = :collection AND slug = :slug');
        $statement->execute(['collection' => $collection, 'slug' => $slug]);

        if ($statement->rowCount() === 0) {
            throw new NotFoundException("Nie znaleziono elementu kolekcji \"{$collection}\" do usunięcia: {$slug}");
        }
    }

    /** @return array{slug: string, content: array<string, mixed>, status: string, publishedAt: ?string, updatedAt: string} */
    private function mapRow(array $row): array
    {
        return [
            'slug' => $row['slug'],
            'content' => $this->decode($row['content']),
            'status' => (string) $row['status'],
            'publishedAt' => $row['published_at'],
            'updatedAt' => $row['updated_at'],
        ];
    }

    private function encode(array $content): string
    {
        try {
            return json_encode($content, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new RuntimeException('Nie udało się zakodować treści do JSON-a.', previous: $exception);
        }
    }

    /** @return array<string, mixed> */
    private function decode(string $json): array
    {
        try {
            /** @var array<string, mixed> $decoded */
            $decoded = json_decode($json, true, 512, JSON_THROW_ON_ERROR);

            return $decoded;
        } catch (JsonException $exception) {
            throw new RuntimeException('Uszkodzony JSON w kolumnie content.', previous: $exception);
        }
    }
}
