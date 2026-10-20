<?php

declare(strict_types=1);

namespace App\PriceReport;

use App\Repository\PageRepositoryInterface;
use DateTimeImmutable;
use DateTimeZone;
use DOMDocument;
use DOMElement;
use DOMXPath;
use RuntimeException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Raporty cen ofertowych (art. 19b ustawy deweloperskiej) dla dane.gov.pl — dla KAŻDEJ
 * inwestycji osobno, z danych w bazie (sekcja "PriceHistory" na stronach
 * /inwestycja/<x>/historia-cen). Następca zewnętrznego ext_price_raport_generator,
 * który obsługiwał jedną inwestycję i czytał dane z API starej strony.
 *
 * Dla inwestycji <klucz> powstaje katalog backend/raporty-cen/<klucz>/ (na serwerze
 * /api/raporty-cen/<klucz>/), a w nim:
 *   dataset.xml   — zbiór dla harvestera dane.gov.pl (ten adres zgłasza się raz, jest stały),
 *   dataset.md5   — suma kontrolna dataset.xml,
 *   ceny-ofertowe-<klucz>-RRRR-MM-DD.csv — dzienny plik danych (jeden "resource" na dzień),
 *   status.json   — wynik ostatniego uruchomienia (panel: Ustawienia → Raportowanie cen).
 *
 * Względem starego skryptu: kolumny po kluczach (stała ustawowa kolejność 58 kolumn),
 * ujednolicone daty (RRRR-MM-DD) i kwoty, "X" dla pól nie dotyczących, brak podwójnego
 * "/" w adresach, zapis atomowy (plik tymczasowy + rename), blokada przed równoległym
 * uruchomieniem, ostrzeżenia zamiast cichego pomijania błędów, szkice nie są publikowane.
 * Ponowne uruchomienie tego samego dnia odświeża dzisiejszy CSV, nie dubluje "resource".
 */
final class PriceReportGenerator
{
    public const DIR_NAME = 'raporty-cen';
    private const HISTORY_SUFFIX = '/historia-cen';
    private const NAMESPACE = 'urn:otwarte-dane:harvester:1.13';
    private const XSI = 'http://www.w3.org/2001/XMLSchema-instance';
    /** Format dat w CSV — jeden dla wszystkich inwestycji (źródła mają RRRR-MM-DD i DD.MM.RRRR naprzemiennie). */
    private const DATE_FORMAT = 'Y-m-d';

    private readonly string $root;
    private readonly string $publicBase;
    private readonly DateTimeZone $zone;

    public function __construct(
        private readonly PageRepositoryInterface $pages,
        string $siteUrl,
        ?string $root = null,
    ) {
        $this->root = $root ?? dirname(__DIR__, 2) . '/' . self::DIR_NAME;
        $this->publicBase = rtrim($siteUrl, '/') . '/api/' . self::DIR_NAME;
        $this->zone = new DateTimeZone('Europe/Warsaw');
    }

    /**
     * Wszystkie inwestycje z tabelą historii cen (także szkice — panel je pokazuje,
     * ale generate() ich nie publikuje).
     *
     * @return list<array{key: string, name: string, sourceSlug: string, published: bool}>
     */
    public function discover(): array
    {
        $found = [];
        foreach ($this->pages->listAll() as $summary) {
            $slug = (string) $summary['slug'];
            if (str_starts_with($slug, '/blog')) {
                continue;
            }
            $page = $this->pages->findBySlug($slug);
            if ($page === null || $this->priceHistorySection($page['content']) === null) {
                continue;
            }
            $key = self::keyFor($slug);
            if (isset($found[$key])) {
                continue;
            }
            $found[$key] = [
                'key' => $key,
                'name' => $this->investmentName($slug, $page['content']),
                'sourceSlug' => $slug,
                'published' => ($page['content']['status'] ?? 'published') !== 'draft',
            ];
        }
        ksort($found);

        return array_values($found);
    }

    /**
     * Generuje raport jednej inwestycji (albo wszystkich, gdy $key === null).
     *
     * @return list<array<string, mixed>> wynik dla każdej inwestycji (ten sam kształt co status.json)
     */
    public function generate(?string $key = null): array
    {
        $this->ensureRoot();
        $lock = fopen($this->root . '/.lock', 'c');
        if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) {
            throw new RuntimeException('Generowanie raportów już trwa — spróbuj za chwilę.');
        }

        try {
            $results = [];
            foreach ($this->discover() as $investment) {
                if ($key !== null && $investment['key'] !== $key) {
                    continue;
                }
                $results[] = $this->generateOne($investment);
            }
            if ($key !== null && $results === []) {
                throw new RuntimeException("Nie ma inwestycji z tabelą historii cen o kluczu \"{$key}\".");
            }

            return $results;
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    /** Katalog raportów danej inwestycji (może jeszcze nie istnieć). */
    public function directory(string $key): string
    {
        if (preg_match('/^[a-z0-9][a-z0-9-]*$/', $key) !== 1) {
            throw new RuntimeException('Nieprawidłowy klucz inwestycji.');
        }

        return $this->root . '/' . $key;
    }

    public function publicUrl(string $key, string $file = ''): string
    {
        return $this->publicBase . '/' . $key . ($file === '' ? '/' : '/' . rawurlencode($file));
    }

    /** @return array<string, mixed>|null zawartość status.json albo null, gdy raport jeszcze nie powstał */
    public function status(string $key): ?array
    {
        $file = $this->directory($key) . '/status.json';
        if (!is_file($file)) {
            return null;
        }
        $decoded = json_decode((string) file_get_contents($file), true);

        return is_array($decoded) ? $decoded : null;
    }

    // ---------------------------------------------------------------------------------

    /**
     * @param array{key: string, name: string, sourceSlug: string, published: bool} $investment
     * @return array<string, mixed>
     */
    private function generateOne(array $investment): array
    {
        $key = $investment['key'];
        $dir = $this->directory($key);
        $now = new DateTimeImmutable('now', $this->zone);
        $today = $now->format('Y-m-d');
        $base = [
            'key' => $key,
            'name' => $investment['name'],
            'sourceSlug' => $investment['sourceSlug'],
            'generatedAt' => $now->format(DATE_ATOM),
            'datasetUrl' => $this->publicUrl($key, 'dataset.xml'),
            'md5Url' => $this->publicUrl($key, 'dataset.md5'),
        ];

        if (!$investment['published']) {
            return $this->finish($dir, $base + ['result' => 'skipped', 'message' => 'Strona historii cen jest szkicem — raport nie jest publikowany.', 'warnings' => []]);
        }

        $page = $this->pages->findBySlug($investment['sourceSlug']);
        $section = $page === null ? null : $this->priceHistorySection($page['content']);
        if ($section === null) {
            return $this->finish($dir, $base + ['result' => 'error', 'message' => 'Nie znaleziono tabeli historii cen.', 'warnings' => []]);
        }

        [$rows, $warnings, $missing] = $this->buildRows($section['columns'], $section['rows']);

        if ($missing !== []) {
            return $this->finish($dir, $base + [
                'result' => 'error',
                'message' => 'Tabela historii cen nie ma kolumn wymaganych w raporcie ustawowym: ' . implode(', ', $missing)
                    . '. Uzupełnij ją do pełnych 58 kolumn (jak w pozostałych inwestycjach).',
                'warnings' => $warnings,
            ]);
        }
        if ($rows === []) {
            return $this->finish($dir, $base + ['result' => 'error', 'message' => 'Tabela historii cen nie ma żadnego wiersza do publikacji.', 'warnings' => $warnings]);
        }

        $developer = trim($rows[0][0] . ' ' . $rows[0][1]);
        $csvName = "ceny-ofertowe-{$key}-{$today}.csv";

        $this->ensureDirectory($dir);
        $this->writeAtomic($dir . '/' . $csvName, $this->csv($rows));
        $added = $this->updateDataset($dir . '/dataset.xml', $developer, $today, $this->publicUrl($key, $csvName));
        $md5 = md5_file($dir . '/dataset.xml');
        if ($md5 === false) {
            throw new RuntimeException("Nie udało się policzyć MD5 dla {$key}/dataset.xml.");
        }
        $this->writeAtomic($dir . '/dataset.md5', $md5);

        return $this->finish($dir, $base + [
            'result' => 'ok',
            'message' => $added ? "Dodano zasób z dnia {$today}." : "Odświeżono plik z dnia {$today} (zasób już był w dataset.xml).",
            'developer' => $developer,
            'dataDate' => $today,
            'rows' => count($rows),
            'csv' => $csvName,
            'csvUrl' => $this->publicUrl($key, $csvName),
            'md5' => $md5,
            'warnings' => $warnings,
        ]);
    }

    /** @param array<string, mixed> $status */
    private function finish(string $dir, array $status): array
    {
        $this->ensureDirectory($dir);
        $this->writeAtomic($dir . '/status.json', (string) json_encode($status, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return $status;
    }

    /**
     * Wiersze tabeli -> 58 wartości w ustawowej kolejności.
     *
     * @param list<array<string, mixed>> $columns
     * @param list<array<string, mixed>> $sourceRows
     * @return array{0: list<list<string>>, 1: list<string>, 2: list<string>}
     */
    private function buildRows(array $columns, array $sourceRows): array
    {
        $available = array_map(static fn (array $column): string => (string) ($column['key'] ?? ''), $columns);
        $resolved = [];
        foreach (StatutoryColumns::ALL as $index => $definition) {
            $resolved[$index] = null;
            foreach ([$definition['key'], ...$definition['aliases']] as $candidate) {
                if (in_array($candidate, $available, true)) {
                    $resolved[$index] = $candidate;
                    break;
                }
            }
        }

        $missing = [];
        foreach (StatutoryColumns::ALL as $index => $definition) {
            if ($resolved[$index] === null && in_array($definition['key'], StatutoryColumns::REQUIRED, true)) {
                $missing[] = $definition['header'];
            }
        }

        $warnings = [];
        $unmapped = array_values(array_diff($available, array_filter($resolved)));
        if ($unmapped !== []) {
            $warnings[] = 'Kolumny pominięte (nie należą do raportu ustawowego): ' . implode(', ', $unmapped) . '.';
        }

        $rows = [];
        $seen = [];
        foreach ($sourceRows as $number => $source) {
            if (!is_array($source) || self::isSold($source)) {
                continue;
            }
            $label = 'Wiersz ' . ($number + 1);
            $row = [];
            foreach (StatutoryColumns::ALL as $index => $definition) {
                $raw = $resolved[$index] === null ? '' : ($source[$resolved[$index]] ?? '');
                [$value, $problem] = self::normalize(is_scalar($raw) ? (string) $raw : '', $definition['kind']);
                if ($problem === null) {
                    [$value, $problem] = self::normalizeIdentifier($definition['key'], $value);
                }
                if ($problem !== null) {
                    $warnings[] = "{$label}: {$definition['header']} — {$problem}";
                }
                $row[] = $value;
            }

            // Wiersz zupełnie pusty (same "X") — np. pozostawiony w panelu szablon.
            if (array_filter($row, static fn (string $value): bool => $value !== 'X') === []) {
                continue;
            }
            $unit = $row[36] !== 'X' ? $row[36] : $row[44];
            if ($unit === 'X') {
                $warnings[] = "{$label}: brak numeru lokalu i oznaczenia części nieruchomości.";
            } elseif (isset($seen[$unit])) {
                $warnings[] = "{$label}: \"{$unit}\" występuje w tabeli więcej niż raz.";
            }
            $seen[$unit] = true;
            if ($row[36] !== 'X' && $row[37] === 'X' && $row[39] === 'X') {
                $warnings[] = "{$label} ({$row[36]}): lokal bez ceny m² i ceny całkowitej.";
            }
            $rows[] = $row;
        }

        return [$rows, $warnings, $missing];
    }

    /** Lokale sprzedane nie trafiają do raportu cen ofertowych (ta sama zasada co tabela na stronie). */
    private static function isSold(array $source): bool
    {
        foreach ($source as $field => $value) {
            if (is_string($value) && stripos((string) $field, 'status') !== false && preg_match('/sprzedan|sold/iu', $value) === 1) {
                return true;
            }
        }

        return false;
    }

    /** @return array{0: string, 1: ?string} [wartość do CSV, opis problemu albo null] */
    private static function normalize(string $raw, string $kind): array
    {
        $value = trim(preg_replace('/\s+/u', ' ', str_replace("\u{00A0}", ' ', $raw)) ?? '');
        if ($value === '' || $value === '-' || $value === '—' || strcasecmp($value, 'x') === 0) {
            return ['X', null];
        }

        if ($kind === StatutoryColumns::PRICE) {
            $number = str_ireplace(['zł', 'pln', ' '], '', $value);
            if (preg_match('/^\d+,\d{1,2}$/', $number) === 1) {
                $number = str_replace(',', '.', $number);
            }
            if (preg_match('/^\d+(\.\d+)?$/', $number) !== 1) {
                return [$value, "nieprawidłowa kwota \"{$value}\""];
            }
            $float = (float) $number;

            return [floor($float) === $float ? (string) (int) $float : number_format($float, 2, '.', ''), null];
        }

        if ($kind === StatutoryColumns::DATE) {
            if (preg_match('/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$/', $value, $m) === 1) {
                [$year, $month, $day] = [(int) $m[1], (int) $m[2], (int) $m[3]];
            } elseif (preg_match('/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/', $value, $m) === 1) {
                [$day, $month, $year] = [(int) $m[1], (int) $m[2], (int) $m[3]];
            } else {
                return [$value, "nieprawidłowa data \"{$value}\""];
            }
            if (!checkdate($month, $day, $year)) {
                return [$value, "nieistniejąca data \"{$value}\""];
            }

            return [(new DateTimeImmutable(sprintf('%04d-%02d-%02d', $year, $month, $day)))->format(self::DATE_FORMAT), null];
        }

        return [$value, null];
    }

    /**
     * KRS / NIP / REGON: same cyfry; KRS uzupełniany zerami do 10 cyfr (w tabelach bywa
     * "1106614" zamiast "0001106614"), NIP i REGON sprawdzane co do długości.
     *
     * @return array{0: string, 1: ?string}
     */
    private static function normalizeIdentifier(string $key, string $value): array
    {
        if ($value === 'X' || !in_array($key, ['krs', 'nip', 'regon'], true)) {
            return [$value, null];
        }
        $digits = preg_replace('/[\s-]+/', '', $value) ?? '';
        if (preg_match('/^\d+$/', $digits) !== 1) {
            return [$value, "nieprawidłowy numer \"{$value}\""];
        }

        return match ($key) {
            'krs' => strlen($digits) <= 10 ? [str_pad($digits, 10, '0', STR_PAD_LEFT), null] : [$value, "KRS ma więcej niż 10 cyfr (\"{$value}\")"],
            'nip' => strlen($digits) === 10 ? [$digits, null] : [$value, "NIP powinien mieć 10 cyfr (\"{$value}\")"],
            default => in_array(strlen($digits), [9, 14], true) ? [$digits, null] : [$value, "REGON powinien mieć 9 lub 14 cyfr (\"{$value}\")"],
        };
    }

    /** @param list<list<string>> $rows */
    private function csv(array $rows): string
    {
        $handle = fopen('php://temp', 'w+');
        if ($handle === false) {
            throw new RuntimeException('Nie udało się przygotować pliku CSV.');
        }
        fwrite($handle, "\xEF\xBB\xBF"); // BOM — Excel poprawnie czyta polskie znaki
        fputcsv($handle, StatutoryColumns::headers(), ';', '"', '');
        foreach ($rows as $row) {
            fputcsv($handle, $row, ';', '"', '');
        }
        rewind($handle);
        $content = (string) stream_get_contents($handle);
        fclose($handle);

        return $content;
    }

    /** Dopisuje zasób z dnia $today (albo aktualizuje jego adres). @return bool true = nowy zasób */
    private function updateDataset(string $file, string $developer, string $today, string $csvUrl): bool
    {
        $dom = new DOMDocument('1.0', 'UTF-8');
        $dom->preserveWhiteSpace = false;
        $dom->formatOutput = true;

        if (is_file($file)) {
            libxml_use_internal_errors(true);
            if (!$dom->load($file)) {
                $errors = array_map(static fn ($error): string => trim($error->message), libxml_get_errors());
                libxml_clear_errors();
                throw new RuntimeException('Nie udało się wczytać istniejącego dataset.xml: ' . implode('; ', $errors));
            }
        } else {
            $this->createDataset($dom, $developer);
        }

        $xpath = new DOMXPath($dom);
        $resources = self::first($xpath, '//*[local-name()="resources"]');
        if (!$resources instanceof DOMElement) {
            throw new RuntimeException('W dataset.xml brakuje elementu <resources>.');
        }

        foreach ($xpath->query('./*[local-name()="resource"]', $resources) ?: [] as $resource) {
            if ($resource instanceof DOMElement && $xpath->evaluate('string(./*[local-name()="dataDate"])', $resource) === $today) {
                $url = self::first($xpath, './*[local-name()="url"]', $resource);
                if ($url !== null) {
                    $url->nodeValue = $csvUrl;
                }
                $this->writeAtomic($file, (string) $dom->saveXML());

                return false;
            }
        }

        $resources->appendChild($this->createResource($dom, $developer, $today, $csvUrl));
        $this->writeAtomic($file, (string) $dom->saveXML());

        return true;
    }

    private function createDataset(DOMDocument $dom, string $developer): void
    {
        $root = $dom->createElementNS(self::NAMESPACE, 'ns2:datasets');
        $root->setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:xsi', self::XSI);
        $dom->appendChild($root);

        $dataset = $dom->createElement('dataset');
        $dataset->setAttribute('status', 'published');
        $root->appendChild($dataset);

        $legal = 'art. 19b. ust. 1 Ustawy z dnia 20 maja 2021 r. o ochronie praw nabywcy lokalu mieszkalnego lub domu jednorodzinnego oraz Deweloperskim Funduszu Gwarancyjnym (Dz. U. z 2024 r. poz. 695)';
        $dataset->appendChild($this->text($dom, 'extIdent', self::randomIdent()));
        $dataset->appendChild($this->bilingual($dom, 'title', "Ceny ofertowe mieszkań dewelopera {$developer}", "Offer prices of apartments of developer {$developer}"));
        $dataset->appendChild($this->bilingual(
            $dom,
            'description',
            "Zbiór danych zawiera informacje o cenach ofertowych mieszkań dewelopera {$developer} udostępniane zgodnie z {$legal}.",
            "The dataset contains information on offer prices of apartments of the developer {$developer} made available in accordance with {$legal}."
        ));
        $dataset->appendChild($this->text($dom, 'updateFrequency', 'daily'));
        foreach (['hasDynamicData' => 'false', 'hasHighValueData' => 'true', 'hasHighValueDataFromEuropeanCommissionList' => 'false', 'hasResearchData' => 'false'] as $name => $value) {
            $dataset->appendChild($this->text($dom, $name, $value));
        }
        $categories = $dom->createElement('categories');
        $categories->appendChild($this->text($dom, 'category', 'ECON'));
        $dataset->appendChild($categories);
        $dataset->appendChild($dom->createElement('resources'));
        $tags = $dom->createElement('tags');
        $tag = $this->text($dom, 'tag', 'Deweloper');
        $tag->setAttribute('lang', 'pl');
        $tags->appendChild($tag);
        $dataset->appendChild($tags);
    }

    private function createResource(DOMDocument $dom, string $developer, string $today, string $csvUrl): DOMElement
    {
        $resource = $dom->createElement('resource');
        $resource->setAttribute('status', 'published');
        $resource->appendChild($this->text($dom, 'extIdent', self::randomIdent()));
        $resource->appendChild($this->text($dom, 'url', $csvUrl));
        $resource->appendChild($this->bilingual($dom, 'title', "Ceny ofertowe mieszkań dewelopera {$developer} {$today}", "Offer prices for developer's apartments {$developer} {$today}"));
        $resource->appendChild($this->bilingual(
            $dom,
            'description',
            "Dane dotyczące cen ofertowych mieszkań dewelopera {$developer} udostępnione {$today} zgodnie z art. 19b ustawy.",
            "Data on offer prices of apartments of developer {$developer} made available {$today} in accordance with art. 19b."
        ));
        $resource->appendChild($this->text($dom, 'availability', 'local'));
        $resource->appendChild($this->text($dom, 'dataDate', $today));
        $signs = $dom->createElement('specialSigns');
        $signs->appendChild($this->text($dom, 'specialSign', 'X'));
        $resource->appendChild($signs);
        foreach (['hasDynamicData' => 'false', 'hasHighValueData' => 'true', 'hasHighValueDataFromEuropeanCommissionList' => 'false', 'hasResearchData' => 'false', 'containsProtectedData' => 'false'] as $name => $value) {
            $resource->appendChild($this->text($dom, $name, $value));
        }

        return $resource;
    }

    /** Pierwszy węzeł dla zapytania XPath (DOMXPath::query() przy błędzie zwraca false, nie null). */
    private static function first(DOMXPath $xpath, string $query, ?DOMElement $context = null): ?\DOMNode
    {
        $list = $xpath->query($query, $context);

        return $list === false ? null : $list->item(0);
    }

    private function text(DOMDocument $dom, string $name, string $value): DOMElement
    {
        $element = $dom->createElement($name);
        $element->appendChild($dom->createTextNode($value));

        return $element;
    }

    private function bilingual(DOMDocument $dom, string $name, string $polish, string $english): DOMElement
    {
        $element = $dom->createElement($name);
        $element->appendChild($this->text($dom, 'polish', $polish));
        $element->appendChild($this->text($dom, 'english', $english));

        return $element;
    }

    /** Jak w starym generatorze: 36 znaków hex. */
    private static function randomIdent(): string
    {
        return bin2hex(random_bytes(18));
    }

    /**
     * @param array<string, mixed> $content
     * @return array{columns: list<array<string, mixed>>, rows: list<array<string, mixed>>}|null
     */
    private function priceHistorySection(array $content): ?array
    {
        foreach ((array) ($content['sections'] ?? []) as $section) {
            if (!is_array($section) || ($section['component'] ?? null) !== 'PriceHistory') {
                continue;
            }
            $fields = (array) ($section['fields'] ?? []);
            $columns = self::unwrap($fields['columns'] ?? []);
            $rows = self::unwrap($fields['rows'] ?? []);

            return [
                'columns' => array_values(array_filter(is_array($columns) ? $columns : [], 'is_array')),
                'rows' => array_values(is_array($rows) ? $rows : []),
            ];
        }

        return null;
    }

    /** @param array<string, mixed> $content */
    private function investmentName(string $slug, array $content): string
    {
        $parentSlug = str_ends_with($slug, self::HISTORY_SUFFIX) ? substr($slug, 0, -strlen(self::HISTORY_SUFFIX)) : $slug;
        $parent = $parentSlug !== $slug ? $this->pages->findBySlug($parentSlug) : null;
        foreach ([$parent['content']['nav']['label'] ?? null, $parent['content']['title'] ?? null, $content['title'] ?? null] as $candidate) {
            $value = self::unwrap($candidate);
            if (is_string($value) && trim($value) !== '') {
                return trim(explode('|', $value)[0]);
            }
        }

        return self::keyFor($slug);
    }

    /** "/inwestycja/rudava-park/historia-cen" -> "rudava-park" */
    public static function keyFor(string $slug): string
    {
        $base = str_ends_with($slug, self::HISTORY_SUFFIX) ? substr($slug, 0, -strlen(self::HISTORY_SUFFIX)) : $slug;
        $segments = array_values(array_filter(explode('/', $base)));
        $key = strtolower((string) end($segments));

        return preg_replace('/[^a-z0-9-]+/', '-', $key) ?: 'inwestycja';
    }

    private static function unwrap(mixed $node): mixed
    {
        return is_array($node) && array_key_exists('value', $node) && array_key_exists('editable', $node) ? $node['value'] : $node;
    }

    private function ensureRoot(): void
    {
        $this->ensureDirectory($this->root);
        // Bez listingu katalogów i z poprawnym typem/kodowaniem plików dla przeglądarek i harvestera.
        $htaccess = $this->root . '/.htaccess';
        if (!is_file($htaccess)) {
            $this->writeAtomic($htaccess, "Options -Indexes\nAddType \"text/csv; charset=utf-8\" .csv\nAddType \"application/xml; charset=utf-8\" .xml\nAddType \"text/plain; charset=utf-8\" .md5\n<FilesMatch \"^(status\\.json|\\.lock)$\">\n  Require all denied\n</FilesMatch>\n");
        }
    }

    private function ensureDirectory(string $dir): void
    {
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new RuntimeException("Nie udało się utworzyć katalogu {$dir}.");
        }
    }

    private function writeAtomic(string $file, string $content): void
    {
        $temp = $file . '.tmp-' . bin2hex(random_bytes(4));
        if (file_put_contents($temp, $content) === false || !rename($temp, $file)) {
            @unlink($temp);
            throw new RuntimeException('Nie udało się zapisać pliku ' . basename($file) . '.');
        }
    }
}
