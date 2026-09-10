<?php

declare(strict_types=1);

/**
 * Backfill "type" (string|bool|number|table|asset) w KOLUMNIE `content`
 * ŻYWEJ bazy — czyta to, co faktycznie jest dziś w `pages`, niezależnie od
 * tego, czy pokrywa się to z plikami seed w db/inwestycje/*.sql (patrz
 * scripts/migrate-field-types.ts — ten skrypt aktualizuje TE pliki, ale
 * checked-in seed może się rozjechać z produkcją po edycjach z panelu, patrz
 * db/schema.sql/004/006 — to dlatego ten backfill nigdy nie czyta z plików,
 * tylko z bazy).
 *
 * Domyślnie DRY RUN — pokazuje co by się zmieniło, nic nie zapisuje.
 * Uruchomienie:
 *   php backend/scripts/backfill-field-types.php              # podgląd
 *   php backend/scripts/backfill-field-types.php --apply       # zapis
 *
 * Wymaga backend/.env z danymi połączenia (patrz backend/.env.example) —
 * ten sam plik, którego używa admin.php/index.php.
 */

define('APP_ENTRY', true);

require __DIR__ . '/../src/Config/Config.php';
require __DIR__ . '/../src/Database/Connection.php';
require __DIR__ . '/../src/Support/Editable.php';

use App\Config\Config;
use App\Database\Connection;
use App\Support\Editable;

$apply = in_array('--apply', $argv, true);

function isScalarValue(mixed $value): bool
{
    return is_string($value) || is_int($value) || is_float($value) || is_bool($value);
}

/** Płaski słownik klucz/wartość (liście: skalary albo obiekty skalarów o jeden poziom głębiej) — patrz src/lib/fieldType.ts::isFlatDict. */
function isFlatDict(array $value): bool
{
    foreach ($value as $leaf) {
        if (isScalarValue($leaf)) {
            continue;
        }
        if (is_array($leaf) && !array_is_list($leaf)) {
            foreach ($leaf as $inner) {
                if (!isScalarValue($inner)) {
                    return false;
                }
            }
            continue;
        }
        return false;
    }
    return true;
}

/** Wierny port src/lib/fieldType.ts::classifyFieldType — MUSI klasyfikować identycznie jak frontend/migracja seedów. */
function classifyFieldType(mixed $value, ?string $label): string
{
    if (is_bool($value)) {
        return 'bool';
    }
    if (is_int($value) || is_float($value)) {
        return 'number';
    }
    if (is_array($value)) {
        if (array_is_list($value)) {
            return 'table';
        }
        return isFlatDict($value) ? 'table' : 'string';
    }
    if (is_string($value)) {
        if (preg_match('/\.(png|jpe?g|gif|webp|svg|avif|ico)(\?.*)?$/i', $value) === 1) {
            return 'asset';
        }
        if ($value === '' && $label !== null && preg_match('/logo|ikon|zdj[eę]c|obraz|miniatur|thumbnail|photo|image|\bt[łl]o\b|background|avatar|favicon|baner|banner|wizualizacj/ui', $label) === 1) {
            return 'asset';
        }
        return 'string';
    }
    return 'string';
}

$addedTotal = 0;
$alreadyTypedTotal = 0;

function backfill(mixed &$node, int &$added, int &$alreadyTyped): void
{
    if (is_array($node) && array_is_list($node)) {
        foreach ($node as &$item) {
            backfill($item, $added, $alreadyTyped);
        }
        unset($item);
        return;
    }

    if (!is_array($node)) {
        return;
    }

    if (Editable::isEditableNode($node)) {
        if (Editable::isValidType($node['type'] ?? null)) {
            $alreadyTyped++;
            return;
        }
        $node['type'] = classifyFieldType($node['value'], $node['label'] ?? null);
        $added++;
        return;
    }

    foreach ($node as &$value) {
        backfill($value, $added, $alreadyTyped);
    }
    unset($value);
}

$config = new Config(__DIR__ . '/../.env');
$pdo = Connection::get($config);

$rows = $pdo->query('SELECT id, slug, content FROM pages ORDER BY id')->fetchAll();

echo ($apply ? "TRYB: ZAPIS\n" : "TRYB: PODGLĄD (dry run) — użyj --apply, żeby faktycznie zapisać\n");
echo str_repeat('-', 70) . "\n";

$update = $pdo->prepare('UPDATE pages SET content = :content WHERE id = :id');
$changedPages = 0;

foreach ($rows as $row) {
    $content = json_decode($row['content'], true, 512, JSON_THROW_ON_ERROR);

    $added = 0;
    $alreadyTyped = 0;
    backfill($content, $added, $alreadyTyped);

    $addedTotal += $added;
    $alreadyTypedTotal += $alreadyTyped;

    printf("%-55s  +%-3d nowych type  (%d już miało)\n", $row['slug'], $added, $alreadyTyped);

    if ($added > 0) {
        $changedPages++;
        if ($apply) {
            $json = json_encode($content, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
            $update->execute(['content' => $json, 'id' => $row['id']]);
        }
    }
}

echo str_repeat('-', 70) . "\n";
printf(
    "Razem: %d stron, %d zmienionych, +%d nowych \"type\" (%d już miało poprawny typ)\n",
    count($rows),
    $changedPages,
    $addedTotal,
    $alreadyTypedTotal
);

if (!$apply && $changedPages > 0) {
    echo "\nNic nie zapisano (dry run). Uruchom z --apply, żeby zapisać te zmiany w bazie.\n";
}
