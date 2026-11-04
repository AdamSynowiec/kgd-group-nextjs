<?php

declare(strict_types=1);

namespace App\PriceReport;

use App\Repository\PageRepositoryInterface;
use DateTimeImmutable;
use DateTimeZone;
use RuntimeException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * "Synchronizuj z ofertą" (Ustawienia → Raportowanie cen): przenosi ceny z tabeli lokali na stronie
 * inwestycji do rejestru cen (sekcja "PriceHistory" na /inwestycja/<x>/historia-cen), z którego
 * PriceReportGenerator buduje raport dla dane.gov.pl.
 *
 * Rejestr to stan bieżący — jeden wiersz na lokal (albo część nieruchomości, np. miejsce parkingowe);
 * historię tworzą dzienne pliki CSV raportu. Synchronizacja niczego nie wylicza ani nie tłumaczy:
 *  - oferta = każda tabela na stronie inwestycji, której wiersze mają pola "unit" i "price"
 *    (Foxhills: Apartments.units, Rudava Park: Apartaments.apartments) — bez konfiguracji;
 *  - cena całkowita ("price") i cena m² ("pricePerM2", jeśli oferta ją ma) trafiają do rejestru
 *    w zapisie z oferty (kwoty ujednolica dopiero generator); data obowiązywania zmienia się
 *    tylko przy cenie, która się zmieniła;
 *  - nowy lokal: dane dewelopera, adresy i prospekt z istniejącego wiersza lokalu, rodzaj
 *    nieruchomości z wiersza lokalu tego samego typu w ofercie, pozostałe kolumny "X";
 *  - lokal sprzedany w ofercie — do usunięcia z rejestru (raport obejmuje lokale w sprzedaży);
 *  - wiersze rejestru spoza oferty (np. miejsca parkingowe dodane ręcznie) zostają nietknięte.
 * Najpierw plan() (podgląd), zapis dopiero apply() z wybranymi zmianami.
 */
final class PriceRegisterSync
{
    private const HISTORY_SUFFIX = '/historia-cen';

    /** Kolumny wspólne dla całej inwestycji — kopiowane do nowego wiersza z istniejącego wiersza lokalu. */
    private const SHARED_KEYS = [
        'developerName', 'developerLegalForm', 'krs', 'ceidgNumber', 'nip', 'regon', 'phone', 'email', 'fax', 'developerWebsite',
        'hqVoivodeship', 'hqCounty', 'hqCommune', 'hqCity', 'hqStreet', 'hqBuildingNo', 'hqUnitNo', 'hqPostalCode',
        'salesVoivodeship', 'salesCounty', 'salesCommune', 'salesCity', 'salesStreet', 'salesBuildingNo', 'salesUnitNo', 'salesPostalCode',
        'salesAdditionalLocations', 'contactMethod',
        'investmentVoivodeship', 'investmentCounty', 'investmentCommune', 'investmentCity', 'investmentStreet', 'investmentBuildingNo', 'investmentPostalCode',
        'prospectusUrl',
    ];

    /** Wymagane w raporcie (StatutoryColumns::REQUIRED bez rodzaju nieruchomości, który jest per lokal). */
    private const REQUIRED_SHARED = ['developerName', 'developerLegalForm', 'nip'];

    /** Pole oferty -> [kolumna ceny, kolumna daty obowiązywania]. */
    private const PRICES = [
        'price' => ['totalPrice', 'totalPriceDate'],
        'pricePerM2' => ['pricePerM2', 'pricePerM2Date'],
    ];

    private const LABELS = [
        'propertyType' => 'Rodzaj nieruchomości',
        'unit' => 'Nr lokalu',
        'totalPrice' => 'Cena całkowita',
        'totalPriceDate' => 'Data ceny całkowitej',
        'pricePerM2' => 'Cena m²',
        'pricePerM2Date' => 'Data ceny m²',
    ];

    private readonly DateTimeZone $zone;

    public function __construct(private readonly PageRepositoryInterface $pages)
    {
        $this->zone = new DateTimeZone('Europe/Warsaw');
    }

    /**
     * Podgląd zmian — nic nie zapisuje. Gdy rejestr nie ma jeszcze wiersza lokalu ("needsShared"), nowe lokale
     * czekają na dane dewelopera z formularza panelu ("shared" — pola, "sharedSuggestions" — gotowe zestawy
     * z rejestrów innych inwestycji do wypełnienia formularza).
     *
     * @return array<string, mixed>
     */
    public function plan(string $registerSlug): array
    {
        $plan = $this->build($registerSlug, null, null);
        $plan['changes'] = array_map(static function (array $change): array {
            unset($change['index'], $change['row']);

            return $change;
        }, $plan['changes']);
        $plan['sharedSuggestions'] = $plan['needsShared'] ? $this->sharedSuggestions($registerSlug) : [];
        unset($plan['content'], $plan['rows'], $plan['sectionIndex']);

        return $plan;
    }

    /**
     * Zapisuje w rejestrze wybrane zmiany (id z plan()). Plan liczony od nowa — zmiana, której już nie ma
     * (np. ktoś w międzyczasie poprawił ofertę), jest pomijana. $shared — dane dewelopera z formularza,
     * potrzebne tylko, gdy rejestr nie ma jeszcze żadnego wiersza lokalu.
     *
     * @param list<string> $ids
     * @param array<string, mixed>|null $shared
     * @param array<string, mixed>|null $propertyTypes
     * @return array{applied: int, created: int, updated: int, removed: int, sharedFields: int, units: list<string>}
     */
    public function apply(string $registerSlug, array $ids, ?array $shared = null, ?array $propertyTypes = null): array
    {
        $plan = $this->build($registerSlug, $shared, $propertyTypes);
        $creating = array_filter($ids, static fn (string $id): bool => str_starts_with($id, 'create:')) !== [];
        if (($plan['needsShared'] && $creating) || $plan['sharedDiff'] !== []) {
            $missing = array_values(array_filter(self::REQUIRED_SHARED, static fn (string $key): bool => self::isEmpty(self::text($shared[$key] ?? ''))));
            if ($shared === null || $missing !== []) {
                throw new RuntimeException('Uzupełnij dane dewelopera (wymagane: nazwa, forma prawna, NIP).');
            }
        }
        $wanted = array_flip($ids);
        $rows = $plan['rows'];
        $counts = ['create' => 0, 'update' => 0, 'remove' => 0];
        $units = [];
        $removed = [];

        // Zmienione dane dewelopera: w każdym wierszu, który miał dotychczasową wartość. Wiersze z inną
        // wartością (np. miejsca parkingowe z osobnym prospektem) zostają bez zmian.
        $sharedFields = 0;
        foreach ($plan['sharedDiff'] as $diff) {
            $touched = false;
            foreach ($rows as $index => $row) {
                $value = self::text($row[$diff['column']] ?? '');
                if ((self::isEmpty($value) ? 'X' : $value) === $diff['from']) {
                    $rows[$index][$diff['column']] = $diff['to'];
                    $touched = true;
                }
            }
            $sharedFields += $touched ? 1 : 0;
        }

        foreach ($plan['changes'] as $change) {
            if (!isset($wanted[$change['id']])) {
                continue;
            }
            if ($change['action'] === 'update') {
                foreach ($change['fields'] as $field) {
                    $rows[$change['index']][$field['key']] = $field['to'];
                }
            } elseif ($change['action'] === 'create') {
                $rows[] = $change['row'];
            } else {
                $removed[$change['index']] = true;
            }
            $counts[$change['action']]++;
            $units[] = $change['unit'];
        }

        if ($units === [] && $sharedFields === 0) {
            return ['applied' => 0, 'created' => 0, 'updated' => 0, 'removed' => 0, 'sharedFields' => 0, 'units' => []];
        }

        $rows = array_values(array_filter($rows, static fn (int $index): bool => !isset($removed[$index]), ARRAY_FILTER_USE_KEY));
        $content = $plan['content'];
        $rowsField = &$content['sections'][$plan['sectionIndex']]['fields']['rows'];
        if (is_array($rowsField) && array_key_exists('value', $rowsField)) {
            $rowsField['value'] = $rows;
        } else {
            $rowsField = $rows;
        }
        unset($rowsField);
        $this->pages->save($registerSlug, $content);

        return [
            'applied' => count($units),
            'created' => $counts['create'],
            'updated' => $counts['update'],
            'removed' => $counts['remove'],
            'sharedFields' => $sharedFields,
            'units' => $units,
        ];
    }

    /**
     * @param array<string, mixed>|null $shared dane dewelopera z formularza (tylko dla pustego rejestru)
     * @param array<string, mixed>|null $propertyTypes typ z oferty -> rodzaj nieruchomości z formularza
     * @return array<string, mixed>
     */
    private function build(string $registerSlug, ?array $shared, ?array $propertyTypes): array
    {
        $register = $this->pages->findBySlug($registerSlug);
        if ($register === null) {
            throw new RuntimeException("Nie znaleziono strony rejestru {$registerSlug}.");
        }
        $content = $register['content'];

        $sectionIndex = null;
        foreach ((array) ($content['sections'] ?? []) as $index => $section) {
            if (is_array($section) && ($section['component'] ?? null) === 'PriceHistory') {
                $sectionIndex = $index;
                break;
            }
        }
        if ($sectionIndex === null) {
            throw new RuntimeException('Strona rejestru nie ma tabeli historii cen.');
        }
        $fields = (array) ($content['sections'][$sectionIndex]['fields'] ?? []);
        $columnList = (array) self::unwrap($fields['columns'] ?? []);
        $columns = array_values(array_filter(array_map(
            static fn (mixed $column): string => is_array($column) ? (string) ($column['key'] ?? '') : '',
            $columnList
        )));
        // Nazwa ustawowa -> klucz kolumny w tym rejestrze (aliasy jak w generatorze, np. "krs" = "krsNumber").
        $col = self::columnMap($columns);
        $c = static fn (string $name): string => $col[$name] ?? $name;
        $rows = array_values(array_filter((array) self::unwrap($fields['rows'] ?? []), 'is_array'));

        $offerSlug = is_string($content['parent'] ?? null) && $content['parent'] !== ''
            ? $content['parent']
            : (str_ends_with($registerSlug, self::HISTORY_SUFFIX) ? substr($registerSlug, 0, -strlen(self::HISTORY_SUFFIX)) : '');
        $offerPage = $offerSlug !== '' ? $this->pages->findBySlug($offerSlug) : null;
        if ($offerPage === null) {
            throw new RuntimeException('Nie znaleziono strony inwestycji z ofertą (rodzic strony historii cen).');
        }
        $offer = self::offerUnits($offerPage['content']);
        if ($offer === []) {
            throw new RuntimeException("Na stronie {$offerSlug} nie ma tabeli lokali (wiersze z polami \"unit\" i \"price\").");
        }

        $warnings = [];

        // Wiersze lokali w rejestrze (części nieruchomości — np. miejsca parkingowe — mają nr lokalu = X).
        $registerIndex = [];
        foreach ($rows as $index => $row) {
            $key = self::key($row[$c('unit')] ?? '');
            if ($key === '') {
                continue;
            }
            if (isset($registerIndex[$key])) {
                $warnings[] = 'Lokal ' . self::text($row[$c('unit')]) . ' występuje w rejestrze więcej niż raz — synchronizowany jest pierwszy wiersz.';
                continue;
            }
            $registerIndex[$key] = $index;
        }

        // Wzór danych dewelopera: najpełniejszy wiersz rejestru (przy remisie — wiersz lokalu, potem pierwszy).
        // W rejestrze bez danych dewelopera — formularz z panelu ("needsShared").
        $templateIndex = null;
        $best = [-1, -1];
        foreach ($rows as $index => $row) {
            if (self::isEmpty(self::text($row[$c('developerName')] ?? ''))) {
                continue;
            }
            $filled = count(array_filter(self::SHARED_KEYS, static fn (string $name): bool => !self::isEmpty(self::text($row[$c($name)] ?? ''))));
            $score = [$filled, self::key($row[$c('unit')] ?? '') !== '' ? 1 : 0];
            if ($score > $best) {
                $best = $score;
                $templateIndex = $index;
            }
        }
        $needsShared = $templateIndex === null;
        $current = [];
        foreach (self::SHARED_KEYS as $name) {
            $value = $needsShared ? '' : self::text($rows[$templateIndex][$c($name)] ?? '');
            $current[$name] = self::isEmpty($value) ? 'X' : $value;
        }
        // Dane z formularza (edycja w panelu) zastępują bieżące — i w nowych lokalach, i w istniejących wierszach.
        $template = $current;
        $sharedDiff = [];
        if ($shared !== null) {
            foreach (self::SHARED_KEYS as $name) {
                if (!array_key_exists($name, $shared)) {
                    continue;
                }
                $value = self::text($shared[$name]);
                $template[$name] = self::isEmpty($value) ? 'X' : $value;
                if (!$needsShared && $template[$name] !== $current[$name]) {
                    $sharedDiff[$name] = ['column' => $c($name), 'from' => $current[$name], 'to' => $template[$name]];
                }
            }
        }
        $labels = [];
        foreach ($columnList as $column) {
            if (is_array($column) && isset($column['key'])) {
                $labels[(string) $column['key']] = (string) ($column['label'] ?? $column['key']);
            }
        }
        $l = static fn (string $name): string => self::LABELS[$name] ?? ($labels[$c($name)] ?? $name);
        $sharedFields = [];
        foreach (self::SHARED_KEYS as $name) {
            if (in_array($c($name), $columns, true)) {
                $sharedFields[] = ['key' => $name, 'label' => $labels[$c($name)] ?? $name, 'required' => in_array($name, self::REQUIRED_SHARED, true)];
            }
        }

        // Rodzaj nieruchomości dla nowych lokali: z wiersza rejestru lokalu tego samego typu w ofercie.
        $typeOfOffer = [];
        foreach ($offer as $unit) {
            $typeOfOffer[self::key($unit['unit'])] = self::text($unit['type'] ?? '');
        }
        $propertyTypeByOfferType = [];
        foreach ($registerIndex as $key => $index) {
            $value = self::text($rows[$index][$c('propertyType')] ?? '');
            // Typ "" = oferta bez kolumny typu (np. Rudava Park) — wtedy jeden rodzaj dla wszystkich lokali.
            if (isset($typeOfOffer[$key]) && !self::isEmpty($value) && !isset($propertyTypeByOfferType[$typeOfOffer[$key]])) {
                $propertyTypeByOfferType[$typeOfOffer[$key]] = $value;
            }
        }
        // Typy bez rodzaju w rejestrze — redaktor wpisuje rodzaj w formularzu panelu (jeden na typ).
        $typesFromRegister = $propertyTypeByOfferType;
        $typesToFill = [];
        foreach ($propertyTypes ?? [] as $type => $value) {
            $value = self::text($value);
            if (is_string($type) && !isset($propertyTypeByOfferType[$type]) && !self::isEmpty($value)) {
                $propertyTypeByOfferType[$type] = $value;
            }
        }

        $today = (new DateTimeImmutable('now', $this->zone))->format('Y-m-d');
        $changes = [];
        $unchanged = 0;
        $offerKeys = [];

        foreach ($offer as $unit) {
            $name = self::text($unit['unit']);
            $key = self::key($name);
            if ($key === '' || isset($offerKeys[$key])) {
                continue;
            }
            $offerKeys[$key] = true;
            $existing = $registerIndex[$key] ?? null;
            $type = self::text($unit['type'] ?? '');
            $sold = preg_match('/sprzedan|sold/iu', self::text($unit['status'] ?? '')) === 1;

            if ($sold) {
                if ($existing !== null) {
                    $changes[] = ['id' => "remove:{$key}", 'action' => 'remove', 'unit' => $name, 'fields' => [], 'note' => 'Sprzedany w ofercie.', 'index' => $existing];
                }
                continue;
            }

            if ($existing !== null) {
                $diff = [];
                foreach (self::PRICES as $source => [$price, $date]) {
                    $offered = self::text($unit[$source] ?? '');
                    if (self::isEmpty($offered) || !in_array($c($price), $columns, true)) {
                        continue;
                    }
                    $registered = self::text($rows[$existing][$c($price)] ?? '');
                    if (self::sameAmount($registered, $offered)) {
                        continue;
                    }
                    $diff[] = self::field($c($price), $l($price), $registered, $offered);
                    $diff[] = self::field($c($date), $l($date), self::text($rows[$existing][$c($date)] ?? ''), $today);
                }
                // Brakujące dane w istniejącym wierszu ("X" tam, gdzie wzór ma wartość) — uzupełnienie ze wzoru.
                $fill = self::missingShared($rows[$existing], $template, $c, $l);
                $registeredType = self::text($rows[$existing][$c('propertyType')] ?? '');
                if (self::isEmpty($registeredType)) {
                    // Bez rodzaju dla tego typu — pole i tak w podglądzie, panel podstawia wpis z formularza.
                    $fill[] = self::field($c('propertyType'), $l('propertyType'), $registeredType, $propertyTypeByOfferType[$type] ?? 'X');
                    if (!isset($typesFromRegister[$type]) && !in_array($type, $typesToFill, true)) {
                        $typesToFill[] = $type;
                    }
                }
                if ($diff === [] && $fill === []) {
                    $unchanged++;
                } else {
                    $changes[] = [
                        'id' => "update:{$key}",
                        'action' => 'update',
                        'unit' => $name,
                        'offerType' => $type,
                        'fields' => [...$diff, ...$fill],
                        'note' => $fill !== [] ? 'Uzupełnienie brakujących danych w rejestrze.' : null,
                        'index' => $existing,
                    ];
                }
            } else {
                $row = array_fill_keys($columns, 'X');
                foreach (self::SHARED_KEYS as $sharedName) {
                    if (in_array($c($sharedName), $columns, true)) {
                        $row[$c($sharedName)] = $template[$sharedName];
                    }
                }
                if (!isset($typesFromRegister[$type]) && !in_array($type, $typesToFill, true)) {
                    $typesToFill[] = $type;
                }
                $row[$c('propertyType')] = $propertyTypeByOfferType[$type] ?? 'X';
                $row[$c('unit')] = $name;
                $created = [self::field($c('propertyType'), $l('propertyType'), '', $row[$c('propertyType')]), self::field($c('unit'), $l('unit'), '', $name)];
                foreach (self::PRICES as $source => [$price, $date]) {
                    $offered = self::text($unit[$source] ?? '');
                    if (self::isEmpty($offered)) {
                        continue;
                    }
                    $row[$c($price)] = $offered;
                    $row[$c($date)] = $today;
                    $created[] = self::field($c($price), $l($price), '', $offered);
                    $created[] = self::field($c($date), $l($date), '', $today);
                }
                $note = $row[$c('propertyType')] === 'X'
                    ? 'Brak rodzaju nieruchomości dla typu „' . ($type !== '' ? $type : '—') . '” — wpisz go w formularzu powyżej.'
                    : null;
                $changes[] = ['id' => "create:{$key}", 'action' => 'create', 'unit' => $name, 'offerType' => $type, 'fields' => $created, 'note' => $note, 'row' => $row];
            }

            // Tylko informacja — synchronizacja przenosi cenę z oferty taką, jaka jest.
            $area = self::amount(self::text($unit['area'] ?? ''));
            $perM2 = self::amount(self::text($unit['pricePerM2'] ?? ''));
            $total = self::amount(self::text($unit['price'] ?? ''));
            if ($area !== null && $perM2 !== null && $total !== null && abs($area * $perM2 - $total) >= 1) {
                $warnings[] = "Lokal {$name}: cena w ofercie (" . self::text($unit['price']) . ') różni się od metraż × cena m² (' . number_format($area * $perM2, 2, ',', ' ') . ' zł).';
            }
        }

        // Pozostałe wiersze spoza oferty (np. miejsca parkingowe): bez zmian cen, ale z uzupełnieniem brakujących danych dewelopera.
        $untouched = [];
        foreach ($rows as $index => $row) {
            $key = self::key($row[$c('unit')] ?? '');
            if ($key !== '' && isset($offerKeys[$key]) && ($registerIndex[$key] ?? null) === $index) {
                continue;
            }
            if ($key !== '' && ($registerIndex[$key] ?? null) === $index) {
                $untouched[] = self::text($row[$c('unit')]);
            }
            $fill = $needsShared ? [] : self::missingShared($row, $template, $c, $l);
            if ($fill !== []) {
                $label = $key !== '' ? self::text($row[$c('unit')]) : self::text($row[$c('propertyPartLabel')] ?? '');
                $changes[] = [
                    'id' => "fill:{$index}",
                    'action' => 'update',
                    'unit' => self::isEmpty($label) ? 'Wiersz ' . ($index + 1) . ' rejestru' : $label,
                    'fields' => $fill,
                    'note' => 'Uzupełnienie brakujących danych dewelopera.',
                    'index' => $index,
                ];
            }
        }

        return [
            'offerSlug' => $offerSlug,
            'registerSlug' => $registerSlug,
            'changes' => $changes,
            'unchanged' => $unchanged,
            'untouched' => $untouched,
            'warnings' => $warnings,
            'needsShared' => $needsShared,
            'shared' => $sharedFields,
            'sharedValues' => $needsShared ? (object) [] : $current,
            'sharedDiff' => $sharedDiff,
            'typesToFill' => $typesToFill,
            'content' => $content,
            'rows' => $rows,
            'sectionIndex' => $sectionIndex,
        ];
    }

    /**
     * Kolumny danych dewelopera, które w wierszu są puste / "X", a wzór ma w nich wartość.
     *
     * @param array<string, mixed> $row
     * @param array<string, string> $template
     * @return list<array{key: string, label: string, from: string, to: string}>
     */
    private static function missingShared(array $row, array $template, callable $c, callable $l): array
    {
        $fill = [];
        foreach (self::SHARED_KEYS as $name) {
            $value = self::text($row[$c($name)] ?? '');
            if (self::isEmpty($value) && $template[$name] !== 'X' && array_key_exists($c($name), $row)) {
                $fill[] = self::field($c($name), $l($name), $value, $template[$name]);
            }
        }

        return $fill;
    }

    /**
     * Nazwa ustawowa -> klucz kolumny w rejestrze: nazwa podstawowa albo pierwszy obecny alias
     * (StatutoryColumns — te same aliasy, które rozpoznaje PriceReportGenerator).
     *
     * @param list<string> $columns
     * @return array<string, string>
     */
    private static function columnMap(array $columns): array
    {
        $map = [];
        foreach (StatutoryColumns::ALL as $definition) {
            foreach ([$definition['key'], ...$definition['aliases']] as $candidate) {
                if (in_array($candidate, $columns, true)) {
                    $map[$definition['key']] = $candidate;
                    break;
                }
            }
        }

        return $map;
    }

    /**
     * Dane dewelopera z pierwszego wiersza lokalu w rejestrach innych inwestycji — do wypełnienia formularza
     * w panelu (redaktor je sprawdza i poprawia, nic nie trafia do rejestru bez jego zapisu).
     *
     * @return list<array{slug: string, name: string, values: array<string, string>}>
     */
    private function sharedSuggestions(string $registerSlug): array
    {
        $suggestions = [];
        foreach ($this->pages->listAll() as $summary) {
            $slug = (string) $summary['slug'];
            if ($slug === $registerSlug || !str_ends_with($slug, self::HISTORY_SUFFIX)) {
                continue;
            }
            $page = $this->pages->findBySlug($slug);
            foreach ((array) ($page['content']['sections'] ?? []) as $section) {
                if (!is_array($section) || ($section['component'] ?? null) !== 'PriceHistory') {
                    continue;
                }
                // Każdy rejestr może mieć własne nazwy kolumn (aliasy) — wartości oddawane pod nazwami ustawowymi.
                $col = self::columnMap(array_values(array_filter(array_map(
                    static fn (mixed $column): string => is_array($column) ? (string) ($column['key'] ?? '') : '',
                    (array) self::unwrap($section['fields']['columns'] ?? [])
                ))));
                foreach ((array) self::unwrap($section['fields']['rows'] ?? []) as $row) {
                    if (!is_array($row) || self::isEmpty(self::text($row[$col['developerName'] ?? 'developerName'] ?? ''))) {
                        continue;
                    }
                    $values = [];
                    foreach (self::SHARED_KEYS as $key) {
                        $value = self::text($row[$col[$key] ?? $key] ?? '');
                        $values[$key] = self::isEmpty($value) ? '' : $value;
                    }
                    $name = $values['developerName'];
                    $suggestions[] = ['slug' => $slug, 'name' => ($name !== '' ? $name : $slug) . ' (' . substr($slug, strlen('/inwestycja/'), -strlen(self::HISTORY_SUFFIX)) . ')', 'values' => $values];
                    break 2;
                }
            }
        }

        return $suggestions;
    }

    /**
     * Lokale z każdej tabeli strony inwestycji, której wiersze mają "unit" i "price".
     *
     * @param array<string, mixed> $content
     * @return list<array<string, mixed>>
     */
    private static function offerUnits(array $content): array
    {
        $units = [];
        foreach ((array) ($content['sections'] ?? []) as $section) {
            foreach ((array) (is_array($section) ? ($section['fields'] ?? []) : []) as $field) {
                $value = self::unwrap($field);
                if (!is_array($value) || !array_is_list($value)) {
                    continue;
                }
                foreach ($value as $row) {
                    if (is_array($row) && array_key_exists('unit', $row) && array_key_exists('price', $row) && self::text($row['unit']) !== '') {
                        $units[] = $row;
                    }
                }
            }
        }

        return $units;
    }

    /** @return array{key: string, label: string, from: string, to: string} — key = kolumna w rejestrze (z aliasem) */
    private static function field(string $key, string $label, string $from, string $to): array
    {
        return ['key' => $key, 'label' => $label, 'from' => $from, 'to' => $to];
    }

    /** Numer lokalu do porównania: bez odstępów i wielkości liter ("M3 B" = "m3b"). */
    private static function key(mixed $unit): string
    {
        $text = self::text($unit);

        return self::isEmpty($text) ? '' : mb_strtoupper(preg_replace('/\s+/u', '', $text) ?? '');
    }

    private static function text(mixed $value): string
    {
        return is_scalar($value) ? trim(str_replace("\u{00A0}", ' ', (string) $value)) : '';
    }

    private static function isEmpty(string $value): bool
    {
        return $value === '' || $value === '-' || $value === '—' || strcasecmp($value, 'x') === 0;
    }

    /** "2 512 750 zł" = "2512750" = "2512750,00" — porównanie kwot bez względu na zapis. */
    private static function sameAmount(string $a, string $b): bool
    {
        $x = self::amount($a);
        $y = self::amount($b);

        return $x !== null && $y !== null ? abs($x - $y) < 0.005 : $a === $b;
    }

    private static function amount(string $value): ?float
    {
        $number = str_ireplace(['zł', 'pln', ' '], '', $value);
        if (preg_match('/^\d+,\d{1,2}$/', $number) === 1) {
            $number = str_replace(',', '.', $number);
        }

        return preg_match('/^\d+(\.\d+)?$/', $number) === 1 ? (float) $number : null;
    }

    private static function unwrap(mixed $node): mixed
    {
        return is_array($node) && array_key_exists('value', $node) && array_key_exists('editable', $node) ? $node['value'] : $node;
    }
}
