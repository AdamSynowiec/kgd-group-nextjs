<?php

declare(strict_types=1);

namespace App\Repository;

use JsonException;
use PDO;
use RuntimeException;

/** Implementacja PageRepositoryInterface na tabeli "pages" (patrz db/schema.sql). */
final class MysqlPageRepository implements PageRepositoryInterface
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function findBySlug(string $slug): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT slug, content, updated_at FROM pages WHERE slug = :slug LIMIT 1'
        );
        $statement->execute(['slug' => $slug]);
        $row = $statement->fetch();

        if ($row === false) {
            return null;
        }

        return [
            'slug' => $row['slug'],
            'content' => $this->decode($row['content']),
            'updatedAt' => $row['updated_at'],
        ];
    }

    public function listPublished(): array
    {
        // Zapytanie w pojedynczych cudzysłowach celowo — PHP nigdy nie interpretuje
        // w nich zmiennych, więc "$.status" (ścieżka JSON dla MySQL) zostaje literałem.
        $statement = $this->pdo->query(
            'SELECT slug, content, updated_at FROM pages '
            . 'WHERE JSON_UNQUOTE(JSON_EXTRACT(content, \'$.status\')) = \'published\' '
            . 'ORDER BY slug'
        );

        $pages = [];
        foreach ($statement as $row) {
            $content = $this->decode($row['content']);
            $pages[] = [
                'slug' => $row['slug'],
                'title' => (string) ($content['title'] ?? $row['slug']),
                'updatedAt' => $row['updated_at'],
            ];
        }

        return $pages;
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
