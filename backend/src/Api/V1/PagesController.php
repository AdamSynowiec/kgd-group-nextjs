<?php

declare(strict_types=1);

namespace App\Api\V1;

use App\Api\Problem;
use App\Api\PublicFields;
use App\Api\Response;
use App\Support\PageIdentity;
use App\Support\Slug;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Opublikowane strony (szkice nigdy) z ich polami publicznymi — patrz Catalog i PublicFields.
 *
 *   GET /v1/pages           kolekcja: filtry type, parent, slug, updatedSince; sort; fields; include; limit/offset
 *   GET /v1/pages/{strona}  jedna strona po identyfikatorze ("rudava-park") albo numerycznym id; fields, include
 *
 * Nieznany albo niepoprawny parametr = 400 z listą błędów — literówka nie daje po cichu innego wyniku.
 * Opis dla integratorów: backend/docs/rest-api-v1.md, specyfikacja: backend/docs/api-v1.openapi.yaml.
 */
final class PagesController
{
    private const DEFAULT_LIMIT = 20;
    private const MAX_LIMIT = 100;
    private const MAX_LIST = 100;
    private const SORTABLE = ['id', 'key', 'type', 'slug', 'createdAt', 'updatedAt'];
    private const INCLUDES = ['children'];

    public function __construct(private readonly Catalog $catalog)
    {
    }

    /** @param array<string, mixed> $query */
    public function show(string $reference, array $query): never
    {
        $params = new QueryParams($query, ['fields', 'include']);
        $fields = $this->fields($params);
        $include = $params->list('include', self::INCLUDES, 'children');
        $params->assertValid();

        $row = $this->catalog->find($reference);
        if ($row === null) {
            throw Problem::notFound("There is no published page \"{$reference}\".");
        }

        $content = $this->catalog->contents([$row['id']])[$row['id']] ?? [];
        Response::json(['data' => $this->resource($row, $content, $fields, $include)]);
    }

    /** @param array<string, mixed> $query */
    public function index(array $query): never
    {
        $params = new QueryParams($query, ['type', 'parent', 'slug', 'updatedSince', 'sort', 'fields', 'include', 'limit', 'offset']);
        $rows = $this->catalog->rows();

        $knownTypes = array_values(array_unique(array_filter(array_column($rows, 'type'))));
        sort($knownTypes);
        $types = $params->list('type', $knownTypes, 'investment,page');
        $parent = $this->parent($params);
        $slug = $this->slug($params);
        $updatedSince = $params->timestamp('updatedSince');
        $sort = $this->sort($params);
        $fields = $this->fields($params);
        $include = $params->list('include', self::INCLUDES, 'children');
        $limit = $params->integer('limit', self::DEFAULT_LIMIT, 1, self::MAX_LIMIT);
        $offset = $params->integer('offset', 0, 0, PHP_INT_MAX);
        $params->assertValid();

        $matching = array_values(array_filter($rows, static fn (array $row): bool =>
            ($types === null || in_array($row['type'], $types, true))
            && ($parent === null || $row['parentId'] === $parent['id'])
            && ($slug === null || $row['slug'] === $slug)
            && ($updatedSince === null || $row['updatedAt'] >= $updatedSince)));

        usort($matching, static function (array $a, array $b) use ($sort): int {
            foreach ($sort as [$field, $direction]) {
                if (($a[$field] === null) !== ($b[$field] === null)) {
                    return $a[$field] === null ? 1 : -1; // puste zawsze na końcu, w obu kierunkach
                }
                $result = self::compare($a[$field], $b[$field]) * $direction;
                if ($result !== 0) {
                    return $result;
                }
            }

            return (int) $a['id'] <=> (int) $b['id'];
        });

        $total = count($matching);
        $window = array_slice($matching, $offset, $limit);
        $contents = $this->catalog->contents(array_column($window, 'id'));
        $data = array_map(fn (array $row): array => $this->resource($row, $contents[$row['id']] ?? [], $fields, $include), $window);

        $linkQuery = $params->present();
        $link = static fn (int $at): string => Links::to('/pages', ['offset' => $at, 'limit' => $limit] + $linkQuery);

        Response::json([
            'data' => $data,
            'meta' => ['total' => $total, 'count' => count($data), 'limit' => $limit, 'offset' => $offset],
            'links' => [
                'self' => $link($offset),
                'next' => $offset + $limit < $total ? $link($offset + $limit) : null,
                'prev' => $offset > 0 ? $link(max(0, $offset - $limit)) : null,
            ],
        ]);
    }

    /**
     * @param array<string, mixed> $row wiersz Catalog
     * @param array<string, mixed> $content
     * @param ?list<string> $fields
     * @param ?list<string> $include
     * @return array<string, mixed>
     */
    private function resource(array $row, array $content, ?array $fields, ?array $include): array
    {
        $parent = $row['parentId'] !== null ? ($this->catalog->rows()[$row['parentId']] ?? null) : null;
        $address = Catalog::address($row);

        $resource = [
            'id' => $row['id'],
            'key' => $row['key'],
            'type' => $row['type'],
            'slug' => $row['slug'],
            'url' => $this->catalog->pageUrl($row['slug']),
            'parent' => $parent !== null ? $this->catalog->reference($parent) : null,
            'createdAt' => Catalog::timestamp($row['createdAt']),
            'updatedAt' => Catalog::timestamp($row['updatedAt']),
            'fields' => $this->catalog->fields($content, $fields),
        ];
        if ($include !== null && in_array('children', $include, true)) {
            $resource['children'] = array_map([$this->catalog, 'reference'], $this->catalog->children($row['id']));
        }
        $resource['links'] = [
            'self' => Links::to('/pages/' . $address),
            'children' => Links::to('/pages', ['parent' => $address]),
        ];

        return $resource;
    }

    /** @return ?list<string> */
    private function fields(QueryParams $params): ?array
    {
        $fields = $params->raw('fields');
        if ($fields === null) {
            return null;
        }
        $list = QueryParams::split($fields);
        $bad = array_values(array_filter($list, static fn (string $key): bool => preg_match(PublicFields::KEY_PATTERN, $key) !== 1));
        if ($list === [] || count($list) > self::MAX_LIST || $bad !== []) {
            $params->invalid('fields', match (true) {
                $list === [] => 'Expected a comma-separated list of field identifiers, e.g. "heroTitle,priceFrom".',
                $bad !== [] => 'Invalid field identifier(s): ' . implode(', ', $bad) . '.',
                default => 'At most ' . self::MAX_LIST . ' fields per request.',
            });

            return null;
        }

        return $list;
    }

    /** @return array<string, mixed>|null wiersz Catalog strony-rodzica */
    private function parent(QueryParams $params): ?array
    {
        $reference = $params->raw('parent');
        if ($reference === null) {
            return null;
        }
        $row = PageIdentity::isValid($reference) || ctype_digit($reference) ? $this->catalog->find($reference) : null;
        if ($row === null) {
            $params->invalid('parent', "No published page \"{$reference}\". Expected a page identifier or numeric id.");
        }

        return $row;
    }

    private function slug(QueryParams $params): ?string
    {
        $raw = $params->raw('slug');
        if ($raw === null) {
            return null;
        }
        $slug = Slug::fromSegments(explode('/', trim($raw, '/')));
        if (trim($raw) === '' || !Slug::isValid($slug)) {
            $params->invalid('slug', 'Expected a page path such as "inwestycja/foxhills".');

            return null;
        }

        return $slug;
    }

    /** @return list<array{0: string, 1: int}> [pole, 1 rosnąco | -1 malejąco] */
    private function sort(QueryParams $params): array
    {
        $raw = $params->raw('sort');
        if ($raw === null) {
            return [['slug', 1]];
        }
        $sort = [];
        foreach (QueryParams::split($raw) as $item) {
            $field = ltrim($item, '-');
            if (!in_array($field, self::SORTABLE, true)) {
                $params->invalid('sort', "Cannot sort by \"{$field}\". Allowed: " . implode(', ', self::SORTABLE) . ' (prefix "-" for descending).');

                return [['slug', 1]];
            }
            $sort[] = [$field, str_starts_with($item, '-') ? -1 : 1];
        }

        return $sort === [] ? [['slug', 1]] : $sort;
    }

    /** Liczby (także numeryczne id w tekście) jako liczby. */
    private static function compare(mixed $a, mixed $b): int
    {
        if (is_string($a) && ctype_digit($a) && is_string($b) && ctype_digit($b)) {
            return (int) $a <=> (int) $b;
        }

        return $a <=> $b;
    }
}
