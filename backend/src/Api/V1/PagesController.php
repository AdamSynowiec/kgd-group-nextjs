<?php

declare(strict_types=1);

namespace App\Api\V1;

use App\Api\Problem;
use App\Api\PublicFields;
use App\Api\Response;
use App\Support\Slug;
use PDO;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * GET /v1/pages — kolekcja opublikowanych stron z ich polami publicznymi (PublicFields).
 *
 * Parametry (nieznany parametr = 400, żeby literówka nie dawała po cichu innego wyniku):
 *   slug    — tylko strona o tym adresie, np. "/inwestycja/foxhills" (z "/" na początku albo bez),
 *   fields  — lista kluczy API po przecinku (sparse fieldset); bez niej — wszystkie pola publiczne.
 *             Klucz, którego strona nie ma, zwracany jest jako null — kształt odpowiedzi jest stały,
 *   limit   — 1..100 (domyślnie 20), offset — od 0 (domyślnie 0).
 *
 * Szkice nigdy nie są zwracane.
 */
final class PagesController
{
    private const ALLOWED_PARAMS = ['route', 'slug', 'fields', 'limit', 'offset'];
    private const DEFAULT_LIMIT = 20;
    private const MAX_LIMIT = 100;

    public function __construct(
        private readonly PDO $pdo,
        private readonly string $siteUrl
    ) {
    }

    /** @param array<string, mixed> $query */
    public function index(array $query): never
    {
        [$slug, $fields, $limit, $offset] = $this->parse($query);

        $where = "JSON_UNQUOTE(JSON_EXTRACT(content, '$.status')) = 'published'";
        $params = [];
        if ($slug !== null) {
            $where .= ' AND slug = :slug';
            $params['slug'] = $slug;
        }

        $count = $this->pdo->prepare("SELECT COUNT(*) FROM pages WHERE {$where}");
        $count->execute($params);
        $total = (int) $count->fetchColumn();

        $statement = $this->pdo->prepare(
            "SELECT id, slug, content, UNIX_TIMESTAMP(updated_at) AS updated_ts FROM pages WHERE {$where} ORDER BY slug LIMIT :limit OFFSET :offset"
        );
        foreach ($params as $name => $value) {
            $statement->bindValue($name, $value);
        }
        $statement->bindValue('limit', $limit, PDO::PARAM_INT);
        $statement->bindValue('offset', $offset, PDO::PARAM_INT);
        $statement->execute();

        $data = [];
        foreach ($statement->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $content = json_decode((string) $row['content'], true);
            $public = PublicFields::of(is_array($content) ? $content : [], $this->siteUrl);
            if ($fields !== null) {
                $public = array_combine($fields, array_map(static fn (string $key): mixed => $public[$key] ?? null, $fields));
            }
            $data[] = [
                'id' => (string) $row['id'],
                'slug' => (string) $row['slug'],
                'updatedAt' => gmdate('Y-m-d\TH:i:s\Z', (int) $row['updated_ts']),
                'fields' => (object) $public,
            ];
        }

        Response::json([
            'data' => $data,
            'meta' => ['total' => $total, 'count' => count($data), 'limit' => $limit, 'offset' => $offset],
            'links' => $this->links($query, $total, $limit, $offset),
        ]);
    }

    /**
     * @param array<string, mixed> $query
     * @return array{0: ?string, 1: ?list<string>, 2: int, 3: int}
     */
    private function parse(array $query): array
    {
        $invalid = [];
        foreach (array_keys($query) as $name) {
            if (!in_array($name, self::ALLOWED_PARAMS, true)) {
                $invalid[] = ['name' => (string) $name, 'reason' => 'Unknown parameter. Allowed: slug, fields, limit, offset.'];
            }
        }

        $slug = null;
        if (array_key_exists('slug', $query)) {
            $raw = is_string($query['slug']) ? trim($query['slug']) : '';
            $slug = Slug::fromSegments(explode('/', trim($raw, '/')));
            if ($raw === '' || !Slug::isValid($slug)) {
                $invalid[] = ['name' => 'slug', 'reason' => 'Expected a page path such as "/inwestycja/foxhills".'];
            }
        }

        $fields = null;
        if (array_key_exists('fields', $query)) {
            $list = is_string($query['fields']) ? array_values(array_unique(array_filter(array_map('trim', explode(',', $query['fields'])), 'strlen'))) : [];
            $bad = array_values(array_filter($list, static fn (string $key): bool => preg_match(PublicFields::KEY_PATTERN, $key) !== 1));
            if ($list === [] || $bad !== []) {
                $invalid[] = ['name' => 'fields', 'reason' => $list === [] ? 'Expected a comma-separated list of field keys.' : 'Invalid field key(s): ' . implode(', ', $bad) . '.'];
            } else {
                $fields = $list;
            }
        }

        $limit = $this->integer($query, 'limit', self::DEFAULT_LIMIT, 1, self::MAX_LIMIT, $invalid);
        $offset = $this->integer($query, 'offset', 0, 0, PHP_INT_MAX, $invalid);

        if ($invalid !== []) {
            throw Problem::invalidParameters($invalid);
        }

        return [$slug, $fields, $limit, $offset];
    }

    /** @param list<array{name: string, reason: string}> $invalid */
    private function integer(array $query, string $name, int $default, int $min, int $max, array &$invalid): int
    {
        if (!array_key_exists($name, $query)) {
            return $default;
        }
        $value = filter_var($query[$name], FILTER_VALIDATE_INT, ['options' => ['min_range' => $min, 'max_range' => $max]]);
        if ($value === false) {
            $invalid[] = ['name' => $name, 'reason' => "Expected an integer between {$min} and " . ($max === PHP_INT_MAX ? '∞' : $max) . '.'];

            return $default;
        }

        return $value;
    }

    /** @return array{self: string, next: ?string, prev: ?string} */
    private function links(array $query, int $total, int $limit, int $offset): array
    {
        unset($query['route']);
        // Ta sama forma adresu, którą przyszło zapytanie: ładna (/api/v1/pages) albo przez front controller.
        $base = str_contains((string) ($_SERVER['REQUEST_URI'] ?? ''), 'v1.php') ? '/api/v1.php?route=/pages&' : '/api/v1/pages?';
        $url = static fn (int $at): string => $base . http_build_query(['offset' => $at, 'limit' => $limit] + $query, '', '&', PHP_QUERY_RFC3986);

        return [
            'self' => $url($offset),
            'next' => $offset + $limit < $total ? $url($offset + $limit) : null,
            'prev' => $offset > 0 ? $url(max(0, $offset - $limit)) : null,
        ];
    }
}
