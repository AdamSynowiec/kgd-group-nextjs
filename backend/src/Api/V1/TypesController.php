<?php

declare(strict_types=1);

namespace App\Api\V1;

use App\Api\PublicFields;
use App\Api\Response;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * GET /v1/types — typy treści i ich pola publiczne, wyliczone z opublikowanych stron (nic nie jest
 * zapisane w kodzie): typ = "apiType" stron, pola = identyfikatory nadane w panelu. "pages" przy polu
 * mówi, na ilu stronach danego typu pole występuje — pole obecne na każdej to stały kontrakt typu.
 */
final class TypesController
{
    public function __construct(private readonly Catalog $catalog)
    {
    }

    /** @param array<string, mixed> $query */
    public function index(array $query): never
    {
        (new QueryParams($query, []))->assertValid();

        $rows = array_filter($this->catalog->rows(), static fn (array $row): bool => $row['type'] !== null);
        $contents = $this->catalog->contents(array_values(array_column($rows, 'id')));

        $types = [];
        foreach ($rows as $row) {
            $type = $row['type'];
            $types[$type] ??= ['key' => $type, 'count' => 0, 'fields' => []];
            $types[$type]['count']++;
            foreach (PublicFields::describe($contents[$row['id']] ?? []) as $key => $field) {
                $types[$type]['fields'][$key] ??= ['key' => $key] + $field + ['pages' => 0];
                $types[$type]['fields'][$key]['pages']++;
            }
        }
        ksort($types);

        $data = array_map(static function (array $type): array {
            ksort($type['fields']);
            $type['fields'] = array_values($type['fields']);
            $type['links'] = ['pages' => Links::to('/pages', ['type' => $type['key']])];

            return $type;
        }, array_values($types));

        Response::json(['data' => $data]);
    }
}
