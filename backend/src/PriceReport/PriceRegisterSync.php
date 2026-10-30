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
     * Podgląd zmian — nic nie zapisuje.
     *
     * @return array{
     *   offerSlug: string,
     *   registerSlug: string,
     *   changes: list<array{id: string, action: string, unit: string, fields: list<array{key: string, label: string, from: string, to: string}>, note: ?string}>,
     *   unchanged: int,
     *   untouched: list<string>,
     *   warnings: list<string>
     * }
     */
    public function plan(string $registerSlug): array
    {
        $plan = $this->build($registerSlug);
        $plan['changes'] = array_map(static function (array $change): array {
            unset($change['index'], $change['row']);

            return $change;
        }, $plan['changes']);
        unset($plan['content'], $plan['rows'], $plan['sectionIndex']);

        return $plan;
    }

    /**
     * Zapisuje w rejestrze wybrane zmiany (id z plan()). Plan liczony od nowa — zmiana, której już nie ma
     * (np. ktoś w międzyczasie poprawił ofertę), jest pomijana.
     *
     * @param list<string> $ids
     * @return array{applied: int, created: int, updated: int, removed: int, units: list<string>}
     */
    public function apply(string $registerSlug, array $ids): array
    {
        $plan = $this->build($registerSlug);
        $wanted = array_flip($ids);
        $rows = $plan['rows'];
        $counts = ['create' => 0, 'update' => 0, 'remove' => 0];
        $units = [];
        $removed = [];

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

        if ($units === []) {
            return ['applied' => 0, 'created' => 0, 'updated' => 0, 'removed' => 0, 'units' => []];
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
            'units' => $units,
        ];
    }

    /** @return array<string, mixed> */
    private function build(string $registerSlug): array
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
        $columns = array_values(array_filter(array_map(
            static fn (mixed $column): string => is_array($column) ? (string) ($column['key'] ?? '') : '',
            (array) self::unwrap($fields['columns'] ?? [])
        )));
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

        // Wiersze lokali w rejestrze (części nieruchomości — np. miejsca parkingowe — mają "unit" = X).
        $registerIndex = [];
        foreach ($rows as $index => $row) {
            $key = self::key($row['unit'] ?? '');
            if ($key === '') {
                continue;
            }
            if (isset($registerIndex[$key])) {
                $warnings[] = "Lokal {$row['unit']} występuje w rejestrze więcej niż raz — synchronizowany jest pierwszy wiersz.";
                continue;
            }
            $registerIndex[$key] = $index;
        }
        $template = $registerIndex === [] ? null : $rows[reset($registerIndex)];

        // Rodzaj nieruchomości dla nowych lokali: z wiersza rejestru lokalu tego samego typu w ofercie.
        $typeOfOffer = [];
        foreach ($offer as $unit) {
            $typeOfOffer[self::key($unit['unit'])] = self::text($unit['type'] ?? '');
        }
        $propertyTypeByOfferType = [];
        foreach ($registerIndex as $key => $index) {
            $type = $typeOfOffer[$key] ?? '';
            $value = self::text($rows[$index]['propertyType'] ?? '');
            if ($type !== '' && !self::isEmpty($value) && !isset($propertyTypeByOfferType[$type])) {
                $propertyTypeByOfferType[$type] = $value;
            }
        }

        $today = (new DateTimeImmutable('now', $this->zone))->format('Y-m-d');
        $changes = [];
        $unchanged = 0;
        $offerKeys = [];
        $missingTemplateWarned = false;

        foreach ($offer as $unit) {
            $name = self::text($unit['unit']);
            $key = self::key($name);
            if ($key === '' || isset($offerKeys[$key])) {
                continue;
            }
            $offerKeys[$key] = true;
            $existing = $registerIndex[$key] ?? null;
            $sold = preg_match('/sprzedan|sold/iu', self::text($unit['status'] ?? '')) === 1;

            if ($sold) {
                if ($existing !== null) {
                    $changes[] = ['id' => "remove:{$key}", 'action' => 'remove', 'unit' => $name, 'fields' => [], 'note' => 'Sprzedany w ofercie.', 'index' => $existing];
                }
                continue;
            }

            if ($existing !== null) {
                $diff = [];
                foreach (self::PRICES as $source => [$column, $dateColumn]) {
                    $offered = self::text($unit[$source] ?? '');
                    if (self::isEmpty($offered) || !in_array($column, $columns, true)) {
                        continue;
                    }
                    $current = self::text($rows[$existing][$column] ?? '');
                    if (self::sameAmount($current, $offered)) {
                        continue;
                    }
                    $diff[] = self::field($column, $current, $offered);
                    $diff[] = self::field($dateColumn, self::text($rows[$existing][$dateColumn] ?? ''), $today);
                }
                if ($diff === []) {
                    $unchanged++;
                } else {
                    $changes[] = ['id' => "update:{$key}", 'action' => 'update', 'unit' => $name, 'fields' => $diff, 'note' => null, 'index' => $existing];
                }
            } elseif ($template === null) {
                if (!$missingTemplateWarned) {
                    $warnings[] = 'Rejestr nie ma jeszcze żadnego wiersza lokalu. Dodaj w nim jeden wiersz z danymi dewelopera (jak w pozostałych inwestycjach) — nowe lokale skopiują z niego dane dewelopera, adresy i prospekt.';
                    $missingTemplateWarned = true;
                }
            } else {
                $row = array_fill_keys($columns, 'X');
                foreach (self::SHARED_KEYS as $shared) {
                    if (in_array($shared, $columns, true)) {
                        $row[$shared] = $template[$shared] ?? 'X';
                    }
                }
                $type = self::text($unit['type'] ?? '');
                $row['propertyType'] = $propertyTypeByOfferType[$type] ?? 'X';
                $row['unit'] = $name;
                $created = [self::field('propertyType', '', $row['propertyType']), self::field('unit', '', $name)];
                foreach (self::PRICES as $source => [$column, $dateColumn]) {
                    $offered = self::text($unit[$source] ?? '');
                    if (self::isEmpty($offered)) {
                        continue;
                    }
                    $row[$column] = $offered;
                    $row[$dateColumn] = $today;
                    $created[] = self::field($column, '', $offered);
                    $created[] = self::field($dateColumn, '', $today);
                }
                $note = $row['propertyType'] === 'X'
                    ? 'Rodzaj nieruchomości do uzupełnienia w rejestrze — w ofercie nie ma innego lokalu typu „' . ($type !== '' ? $type : '—') . '” z wpisanym rodzajem.'
                    : null;
                $changes[] = ['id' => "create:{$key}", 'action' => 'create', 'unit' => $name, 'fields' => $created, 'note' => $note, 'row' => $row];
            }

            // Tylko informacja — synchronizacja przenosi cenę z oferty taką, jaka jest.
            $area = self::amount(self::text($unit['area'] ?? ''));
            $perM2 = self::amount(self::text($unit['pricePerM2'] ?? ''));
            $total = self::amount(self::text($unit['price'] ?? ''));
            if ($area !== null && $perM2 !== null && $total !== null && abs($area * $perM2 - $total) >= 1) {
                $warnings[] = "Lokal {$name}: cena w ofercie ({$unit['price']}) różni się od metraż × cena m² (" . number_format($area * $perM2, 2, ',', ' ') . ' zł).';
            }
        }

        $untouched = [];
        foreach ($registerIndex as $key => $index) {
            if (!isset($offerKeys[$key])) {
                $untouched[] = self::text($rows[$index]['unit'] ?? '');
            }
        }

        return [
            'offerSlug' => $offerSlug,
            'registerSlug' => $registerSlug,
            'changes' => $changes,
            'unchanged' => $unchanged,
            'untouched' => $untouched,
            'warnings' => $warnings,
            'content' => $content,
            'rows' => $rows,
            'sectionIndex' => $sectionIndex,
        ];
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

    /** @return array{key: string, label: string, from: string, to: string} */
    private static function field(string $key, string $from, string $to): array
    {
        return ['key' => $key, 'label' => self::LABELS[$key] ?? $key, 'from' => $from, 'to' => $to];
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
