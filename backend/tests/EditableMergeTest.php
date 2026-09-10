<?php

declare(strict_types=1);

/**
 * Test bez frameworka (projekt nie ma composer.json/PHPUnit) — proste
 * porównania i podsumowanie, uruchamiany ręcznie:
 *   php backend/tests/EditableMergeTest.php
 * Sprawdza dokładnie to, co odróżnia nowy, świadomy "type" EditableMerge od
 * starego, gettype()-owego: walidację wartości względem zadeklarowanego typu,
 * to że "label" jest teraz mergowalny, i to że "type" NIGDY nie jest brany
 * z żądania. Incoming payloady mają kształt {value, editable, ...} — dokładnie
 * taki, jaki realnie wysyła panel (cała, niezmieniona kopia drzewa treści
 * z jedną zmienioną wartością), nie gołe {value: ...}.
 */

define('APP_ENTRY', true);

require __DIR__ . '/../src/Support/Editable.php';
require __DIR__ . '/../src/Support/EditableMerge.php';

use App\Support\Editable;
use App\Support\EditableMerge;

$failures = [];

function check(string $name, mixed $actual, mixed $expected): void
{
    global $failures;
    $ok = $actual === $expected || (is_array($actual) && is_array($expected) && $actual == $expected);
    echo ($ok ? "PASS" : "FAIL") . " - {$name}\n";
    if (!$ok) {
        $failures[] = $name;
        echo "  expected: " . json_encode($expected) . "\n";
        echo "  actual:   " . json_encode($actual) . "\n";
    }
}

function incoming(mixed $value, ?string $label = null): array
{
    $node = ['value' => $value, 'editable' => true];
    if ($label !== null) {
        $node['label'] = $label;
    }
    return $node;
}

// --- Editable::isValidType --------------------------------------------------

check('isValidType accepts all 5 declared types', array_map(
    fn ($t) => Editable::isValidType($t),
    Editable::FIELD_TYPES
), [true, true, true, true, true]);

check('isValidType rejects unknown/garbage', Editable::isValidType('richtext'), false);
check('isValidType rejects non-string', Editable::isValidType(null), false);

// --- string field: accepted / rejected by type ------------------------------

$storedString = ['value' => 'Witaj', 'editable' => true, 'label' => 'Tytuł', 'type' => 'string'];

check(
    'string field accepts a new string',
    EditableMerge::apply($storedString, incoming('Nowy tytuł'))['value'],
    'Nowy tytuł'
);

check(
    'string field rejects a table payload, keeps stored value',
    EditableMerge::apply($storedString, incoming([1, 2, 3]))['value'],
    'Witaj'
);

// --- bool / number -----------------------------------------------------------

$storedBool = ['value' => false, 'editable' => true, 'type' => 'bool'];
check('bool field accepts true', EditableMerge::apply($storedBool, incoming(true))['value'], true);
check(
    'bool field rejects a string, keeps stored value',
    EditableMerge::apply($storedBool, incoming('tak'))['value'],
    false
);

$storedNumber = ['value' => 1, 'editable' => true, 'type' => 'number'];
check('number field accepts an int', EditableMerge::apply($storedNumber, incoming(42))['value'], 42);
check('number field accepts a float', EditableMerge::apply($storedNumber, incoming(3.5))['value'], 3.5);
check(
    'number field rejects a string, keeps stored value',
    EditableMerge::apply($storedNumber, incoming('42'))['value'],
    1
);

// --- table: three real shapes -------------------------------------------------

$storedTableList = ['value' => ['Start', 'Inwestycja'], 'editable' => true, 'type' => 'table'];
check(
    'table (list of scalars) accepts add/remove row',
    EditableMerge::apply($storedTableList, incoming(['Start', 'Inwestycja', 'Kontakt']))['value'],
    ['Start', 'Inwestycja', 'Kontakt']
);

$storedTableRows = [
    'value' => [['unit' => 'M 11-1', 'images' => []]],
    'editable' => true,
    'type' => 'table',
];
check(
    'table (list of objects incl. nested images[]) accepts populated images',
    EditableMerge::apply(
        $storedTableRows,
        incoming([['unit' => 'M 11-1', 'images' => ['/api/uploads/a.jpg', '/api/uploads/b.jpg']]])
    )['value'],
    [['unit' => 'M 11-1', 'images' => ['/api/uploads/a.jpg', '/api/uploads/b.jpg']]]
);

$storedDict = [
    'value' => ['name' => 'Podaj imię', 'emailRequired' => 'Podaj email'],
    'editable' => true,
    'type' => 'table',
];
check(
    'table (flat dictionary) accepts edited values',
    EditableMerge::apply(
        $storedDict,
        incoming(['name' => 'Podaj imię i nazwisko', 'emailRequired' => 'Podaj email'])
    )['value'],
    ['name' => 'Podaj imię i nazwisko', 'emailRequired' => 'Podaj email']
);

check(
    'table rejects a plain string replacement, keeps stored value',
    EditableMerge::apply($storedTableList, incoming('nie tabela'))['value'],
    ['Start', 'Inwestycja']
);

// --- asset ---------------------------------------------------------------------

$storedAsset = ['value' => '/investments/x/hero.jpg', 'editable' => true, 'type' => 'asset'];
check(
    'asset field accepts a new path string',
    EditableMerge::apply($storedAsset, incoming('/api/uploads/abc123.jpg'))['value'],
    '/api/uploads/abc123.jpg'
);

// --- label is now genuinely editable, independently of value -------------------

check(
    'label merges from incoming when non-empty',
    EditableMerge::apply($storedString, incoming('Witaj', 'Nowa etykieta'))['label'],
    'Nowa etykieta'
);

check(
    'label stays stored when incoming label is empty/missing',
    EditableMerge::apply($storedString, incoming('Witaj'))['label'],
    'Tytuł'
);

// --- type is never writable from the request ------------------------------------

$incomingWithForgedType = incoming('Witaj');
$incomingWithForgedType['type'] = 'bool';
check(
    'type is never taken from incoming, even if incoming tries to change it',
    EditableMerge::apply($storedString, $incomingWithForgedType)['type'],
    'string'
);

// --- editable:false is still fully locked ----------------------------------------

$storedLocked = ['value' => 'Nie ruszaj', 'editable' => false, 'type' => 'string'];
check(
    'editable:false blocks any change at all',
    EditableMerge::apply($storedLocked, incoming('Próba zmiany', 'Też nie')),
    $storedLocked
);

// --- legacy node without "type" falls back to gettype()-only coercion (pre-migration safety) ---

$storedLegacy = ['value' => 'Stary węzeł bez type', 'editable' => true];
check(
    'node without type falls back to legacy gettype() coercion',
    EditableMerge::apply($storedLegacy, incoming('Nowa treść'))['value'],
    'Nowa treść'
);

echo "\n" . (count($failures) === 0 ? "ALL PASS" : count($failures) . " FAILED: " . implode(', ', $failures)) . "\n";
exit(count($failures) === 0 ? 0 : 1);
