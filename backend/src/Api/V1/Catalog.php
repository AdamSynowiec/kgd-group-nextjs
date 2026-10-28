<?php

declare(strict_types=1);

namespace App\Api\V1;

use App\Api\PublicFields;
use App\Support\PageIdentity;
use PDO;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Opublikowane strony widziane przez REST API v1 — wspólne dla PagesController i TypesController.
 *
 * Indeks (rows) jest lekki: bez treści, tylko tożsamość, typ, daty i rodzic, więc filtrowanie
 * i sortowanie całej kolekcji nie wczytuje dużych dokumentów; treść pobierana jest tylko dla
 * stron, które trafią do odpowiedzi (contents).
 *
 * Rodzic NIE jest zapisany w danych: to najbliższa opublikowana strona, której adres jest
 * przodkiem adresu tej strony ("/inwestycja/x/historia-cen" -> "/inwestycja/x"). Strona główna
 * "/" nie jest rodzicem stron najwyższego poziomu.
 *
 * @phpstan-type Row array{id: string, key: ?string, type: ?string, slug: string, createdAt: int, updatedAt: int, parentId: ?string}
 */
final class Catalog
{
    /** @var array<string, Row>|null id => wiersz, w kolejności adresów */
    private ?array $rows = null;

    public function __construct(
        private readonly PDO $pdo,
        private readonly string $siteUrl
    ) {
    }

    /** @return array<string, Row> */
    public function rows(): array
    {
        if ($this->rows !== null) {
            return $this->rows;
        }

        $statement = $this->pdo->query(
            "SELECT id, slug,
                    JSON_UNQUOTE(JSON_EXTRACT(content, '$.apiKey')) AS api_key,
                    JSON_UNQUOTE(JSON_EXTRACT(content, '$.apiType')) AS api_type,
                    UNIX_TIMESTAMP(created_at) AS created_ts,
                    UNIX_TIMESTAMP(updated_at) AS updated_ts
             FROM pages
             WHERE JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'published'
             ORDER BY slug"
        );

        $rows = [];
        $idBySlug = [];
        foreach ($statement->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $id = (string) $row['id'];
            $idBySlug[(string) $row['slug']] = $id;
            $rows[$id] = [
                'id' => $id,
                'key' => self::identifier($row['api_key']),
                'type' => self::identifier($row['api_type']),
                'slug' => (string) $row['slug'],
                'createdAt' => (int) $row['created_ts'],
                'updatedAt' => (int) $row['updated_ts'],
                'parentId' => null,
            ];
        }

        foreach ($rows as $id => $row) {
            $ancestor = $row['slug'];
            while (($cut = strrpos($ancestor, '/')) !== false && $cut > 0) {
                $ancestor = substr($ancestor, 0, $cut);
                if (isset($idBySlug[$ancestor])) {
                    $rows[$id]['parentId'] = $idBySlug[$ancestor];
                    break;
                }
            }
        }

        return $this->rows = $rows;
    }

    /** Strona po identyfikatorze ("rudava-park") albo numerycznym id ("7"). @return Row|null */
    public function find(string $reference): ?array
    {
        $rows = $this->rows();
        if (ctype_digit($reference)) {
            return $rows[$reference] ?? null;
        }
        foreach ($rows as $row) {
            if ($row['key'] === $reference) {
                return $row;
            }
        }

        return null;
    }

    /** @return list<Row> bezpośrednie podstrony */
    public function children(string $id): array
    {
        return array_values(array_filter($this->rows(), static fn (array $row): bool => $row['parentId'] === $id));
    }

    /**
     * Treść wskazanych stron.
     *
     * @param list<string> $ids
     * @return array<string, array<string, mixed>> id => treść
     */
    public function contents(array $ids): array
    {
        if ($ids === []) {
            return [];
        }
        $placeholders = implode(', ', array_fill(0, count($ids), '?'));
        $statement = $this->pdo->prepare("SELECT id, content FROM pages WHERE id IN ({$placeholders})");
        $statement->execute(array_values($ids));

        $contents = [];
        foreach ($statement->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $decoded = json_decode((string) $row['content'], true);
            $contents[(string) $row['id']] = is_array($decoded) ? $decoded : [];
        }

        return $contents;
    }

    /** Pola publiczne strony (opcjonalnie tylko wybrane — brakujące jako null). @param ?list<string> $only */
    public function fields(array $content, ?array $only): object
    {
        $fields = PublicFields::of($content, $this->siteUrl);
        if ($only !== null) {
            $fields = array_combine($only, array_map(static fn (string $key): mixed => $fields[$key] ?? null, $only));
        }

        return (object) $fields;
    }

    /** Adres strony w serwisie (serwis eksportowany z ukośnikiem na końcu adresów). */
    public function pageUrl(string $slug): string
    {
        return $this->siteUrl . rtrim($slug, '/') . '/';
    }

    /** Krótka referencja do strony: rodzic, podstrona. @param Row $row */
    public function reference(array $row): array
    {
        return [
            'id' => $row['id'],
            'key' => $row['key'],
            'type' => $row['type'],
            'slug' => $row['slug'],
            'links' => ['self' => Links::to('/pages/' . self::address($row))],
        ];
    }

    /** Segment adresu strony w API: identyfikator, a gdy go brak — numeryczne id. @param Row $row */
    public static function address(array $row): string
    {
        return $row['key'] ?? $row['id'];
    }

    public static function timestamp(int $unix): string
    {
        return gmdate('Y-m-d\TH:i:s\Z', $unix);
    }

    private static function identifier(mixed $value): ?string
    {
        return PageIdentity::isValid($value) ? $value : null;
    }
}
