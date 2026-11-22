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
     * Wszystkie inwestycje z tabelą historii cen (także szkice i wyłączone — panel je
     * pokazuje, ale generate() ich nie publikuje).
     *
     * @return list<array{key: string, name: string, sourceSlug: string, published: bool, enabled: bool, disabled: array{at: string, by: ?string, reason: string}|null}>
     */
    public function discover(): array
    {
        $disabled = $this->disabledMap();
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
                'enabled' => !isset($disabled[$key]),
                'disabled' => $disabled[$key] ?? null,
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
        return $this->locked(function () use ($key): array {
            $results = [];
            foreach ($this->discover() as $investment) {
                if ($key !== null && $investment['key'] !== $key) {
                    continue;
                }
                if (!$investment['enabled']) {
                    // Wyłączona (np. zakończona inwestycja): bez nowych plików — katalog i dotychczasowy
                    // dataset.xml zostają bez zmian (dane historyczne na dane.gov.pl).
                    if ($key !== null) {
                        throw new RuntimeException("Raportowanie dla \"{$investment['name']}\" jest wyłączone — włącz je, żeby wygenerować raport.");
                    }
                    $results[] = [
                        'key' => $investment['key'],
                        'name' => $investment['name'],
                        'sourceSlug' => $investment['sourceSlug'],
                        'result' => 'disabled',
                        'message' => 'Raportowanie wyłączone.',
                        'warnings' => [],
                    ];
                    continue;
                }
                $results[] = $this->generateOne($investment);
            }
            if ($key !== null && $results === []) {
                throw new RuntimeException("Nie ma inwestycji z tabelą historii cen o kluczu \"{$key}\".");
            }

            return $results;
        });
    }

    /**
     * Włącza / wyłącza raportowanie inwestycji (np. zakończonej — wszystkie lokale sprzedane).
     * Stan w raporty-cen/settings.json (na serwerze, jak same raporty — deploy go nie rusza).
     */
    public function setEnabled(string $key, bool $enabled, ?string $by, string $reason = ''): void
    {
        $this->directory($key); // walidacja klucza
        if (!in_array($key, array_column($this->discover(), 'key'), true)) {
            throw new RuntimeException("Nie ma inwestycji z tabelą historii cen o kluczu \"{$key}\".");
        }
        $this->ensureRoot();
        $settings = $this->settings();
        $disabled = is_array($settings['disabled'] ?? null) ? $settings['disabled'] : [];
        if ($enabled) {
            unset($disabled[$key]);
        } else {
            $disabled[$key] = [
                'at' => (new DateTimeImmutable('now', $this->zone))->format(DATE_ATOM),
                'by' => $by,
                'reason' => mb_substr(trim($reason), 0, 300),
            ];
        }
        $settings['disabled'] = $disabled === [] ? new \stdClass() : $disabled;
        $this->writeAtomic($this->root . '/settings.json', (string) json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    /** @return array<string, mixed> */
    private function settings(): array
    {
        $file = $this->root . '/settings.json';
        if (!is_file($file)) {
            return [];
        }
        $decoded = json_decode((string) file_get_contents($file), true);

        return is_array($decoded) ? $decoded : [];
    }

    /** @return array<string, array{at: string, by: ?string, reason: string}> */
    private function disabledMap(): array
    {
        $disabled = $this->settings()['disabled'] ?? [];

        return is_array($disabled) ? array_filter($disabled, 'is_array') : [];
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

    /**
     * Dni bez raportu: od pierwszego CSV do wczoraj (dzisiejszy robi cron / "Generuj teraz") — dzień,
     * dla którego nie ma pliku CSV albo zasobu w dataset.xml. Dla wyłączonej inwestycji tylko do dnia
     * przed wyłączeniem (później raporty celowo nie powstają).
     *
     * @return list<string> daty RRRR-MM-DD, od najstarszej
     */
    public function missingDates(string $key): array
    {
        $dir = $this->directory($key);
        $csv = $this->csvDates($key);
        if ($csv === []) {
            return [];
        }
        $inDataset = array_flip($this->datasetDates($dir . '/dataset.xml'));

        $end = (new DateTimeImmutable('yesterday', $this->zone))->format('Y-m-d');
        $disabledAt = $this->disabledMap()[$key]['at'] ?? null;
        if (is_string($disabledAt) && $disabledAt !== '') {
            $dayBefore = (new DateTimeImmutable($disabledAt))->setTimezone($this->zone)->modify('-1 day')->format('Y-m-d');
            $end = min($end, $dayBefore);
        }

        $missing = [];
        $day = new DateTimeImmutable(array_key_first($csv), $this->zone);
        for ($guard = 0; $guard < 3660 && ($date = $day->format('Y-m-d')) <= $end; $guard++, $day = $day->modify('+1 day')) {
            if (!isset($csv[$date]) || !isset($inDataset[$date])) {
                $missing[] = $date;
            }
        }

        return $missing;
    }

    /**
     * Uzupełnia brakujące dni (missingDates): CSV dnia = kopia ostatniego wcześniejszego raportu (ceny
     * ofertowe bez zmian od tamtego dnia — nowszych danych z tamtych dni nie ma), zasób w dataset.xml
     * z datą tego dnia (w kolejności dat) i nowa suma MD5. Istniejących plików nie zmienia.
     *
     * @return array{key: string, filled: list<string>, skipped: list<string>, md5: ?string, message: string}
     */
    public function backfill(string $key): array
    {
        $this->ensureRoot();
        $lock = fopen($this->root . '/.lock', 'c');
        if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) {
            throw new RuntimeException('Generowanie raportów już trwa — spróbuj za chwilę.');
        }

        try {
            $dir = $this->directory($key);
            $missing = $this->missingDates($key);
            if ($missing === []) {
                return ['key' => $key, 'filled' => [], 'skipped' => [], 'md5' => null, 'message' => 'Nie brakuje żadnego dnia.'];
            }

            $filled = [];
            $skipped = [];
            foreach ($missing as $date) {
                $csvName = "ceny-ofertowe-{$key}-{$date}.csv";
                $csvPath = $dir . '/' . $csvName;
                if (!is_file($csvPath)) {
                    $source = $this->previousCsv($key, $date);
                    if ($source === null) {
                        $skipped[] = $date;
                        continue;
                    }
                    $this->writeAtomic($csvPath, (string) file_get_contents($source));
                }
                $developer = $this->developerFromCsv($csvPath);
                if ($developer === '') {
                    $skipped[] = $date;
                    continue;
                }
                $this->updateDataset($dir . '/dataset.xml', $developer, $date, $this->publicUrl($key, $csvName));
                $filled[] = $date;
            }

            $md5 = null;
            if ($filled !== []) {
                $md5 = md5_file($dir . '/dataset.xml');
                if ($md5 === false) {
                    throw new RuntimeException("Nie udało się policzyć MD5 dla {$key}/dataset.xml.");
                }
                $this->writeAtomic($dir . '/dataset.md5', $md5);
            }

            $message = $filled === [] ? 'Nie udało się uzupełnić żadnego dnia.' : 'Uzupełniono dni: ' . implode(', ', $filled) . '.';
            if ($skipped !== []) {
                $message .= ' Pominięte (brak wcześniejszego raportu lub danych dewelopera): ' . implode(', ', $skipped) . '.';
            }

            return ['key' => $key, 'filled' => $filled, 'skipped' => $skipped, 'md5' => $md5 === null ? null : (string) $md5, 'message' => $message];
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    /**
     * Ponowne wygenerowanie raportów z wybranych dni (np. źle wygenerowanych albo usuniętych) z AKTUALNEGO rejestru
     * cen — tak, jakby tamtego dnia cron wygenerował je poprawnie: plik CSV dnia (nadpisany albo nowy), zasób
     * w dataset.xml na swoim miejscu w kolejności dat (istniejący zachowuje identyfikator extIdent — dane.gov.pl
     * podmienia plik w tym samym zasobie, zamiast usuwać go i dodawać nowy) i nowa suma MD5.
     *
     * @param list<string> $dates RRRR-MM-DD
     * @return array{key: string, generated: list<string>, md5: string, warnings: list<string>, message: string}
     */
    public function regenerateDays(string $key, array $dates): array
    {
        return $this->locked(function () use ($key, $dates): array {
            $dates = self::validDates($dates);
            $now = new DateTimeImmutable('now', $this->zone);
            $today = $now->format('Y-m-d');
            foreach ($dates as $date) {
                if ($date > $today) {
                    throw new RuntimeException("Nie można wygenerować raportu z przyszłej daty ({$date}).");
                }
            }

            $investment = $this->investment($key);
            if (!$investment['published']) {
                throw new RuntimeException('Strona historii cen jest szkicem — raport nie jest publikowany.');
            }
            $prepared = $this->prepare($investment);
            if ($prepared['error'] !== null) {
                throw new RuntimeException($prepared['error']);
            }

            $dir = $this->directory($key);
            $this->ensureDirectory($dir);
            $csv = $prepared['csv'];
            foreach ($dates as $date) {
                $csvName = self::csvName($key, $date);
                $this->writeAtomic($dir . '/' . $csvName, $csv);
                $this->updateDataset($dir . '/dataset.xml', $prepared['developer'], $date, $this->publicUrl($key, $csvName));
            }
            $md5 = $this->writeMd5($dir);

            // Dzisiejszy dzień — status jak po zwykłym "Generuj teraz".
            if (in_array($today, $dates, true)) {
                $csvName = self::csvName($key, $today);
                $this->finish($dir, $this->statusBase($investment, $now) + [
                    'result' => 'ok',
                    'message' => "Wygenerowano ponownie plik z dnia {$today}.",
                    'developer' => $prepared['developer'],
                    'dataDate' => $today,
                    'rows' => count($prepared['rows']),
                    'csv' => $csvName,
                    'csvUrl' => $this->publicUrl($key, $csvName),
                    'md5' => $md5,
                    'warnings' => $prepared['warnings'],
                ]);
            }

            return [
                'key' => $key,
                'generated' => $dates,
                'md5' => $md5,
                'warnings' => $prepared['warnings'],
                'message' => 'Wygenerowano z aktualnego rejestru cen: ' . implode(', ', $dates) . '.',
            ];
        });
    }

    /**
     * Usuwa raporty z wybranych dni bez śladu: zasób dnia z dataset.xml, plik CSV dnia i nowa suma MD5.
     * Usunięte dni pojawią się w "brakujących" (missingDates) — można je wygenerować od nowa (regenerateDays).
     *
     * @param list<string> $dates RRRR-MM-DD
     * @return array{key: string, deleted: list<string>, notFound: list<string>, md5: ?string, message: string}
     */
    public function deleteDays(string $key, array $dates): array
    {
        return $this->locked(function () use ($key, $dates): array {
            $dates = self::validDates($dates);
            $dir = $this->directory($key);
            $datasetFile = $dir . '/dataset.xml';
            $inDataset = array_flip($this->datasetDates($datasetFile));

            $deleted = [];
            $notFound = [];
            foreach ($dates as $date) {
                if (isset($inDataset[$date]) || is_file($dir . '/' . self::csvName($key, $date))) {
                    $deleted[] = $date;
                } else {
                    $notFound[] = $date;
                }
            }
            if ($deleted === []) {
                return ['key' => $key, 'deleted' => [], 'notFound' => $notFound, 'md5' => null, 'message' => 'Nie ma raportów z wybranych dni.'];
            }

            // Najpierw dataset.xml (zapis atomowy), potem pliki — przy błędzie zbiór nie wskazuje na usunięte pliki.
            $md5 = null;
            if (is_file($datasetFile)) {
                $this->removeResources($datasetFile, $deleted);
                $md5 = $this->writeMd5($dir);
            }
            foreach ($deleted as $date) {
                $csvPath = $dir . '/' . self::csvName($key, $date);
                if (is_file($csvPath) && !unlink($csvPath)) {
                    throw new RuntimeException('Nie udało się usunąć pliku ' . self::csvName($key, $date) . '.');
                }
            }
            // Status ostatniego uruchomienia opisywał usunięty dzisiejszy plik — nieaktualny.
            $today = (new DateTimeImmutable('now', $this->zone))->format('Y-m-d');
            if (in_array($today, $deleted, true) && is_file($dir . '/status.json')) {
                unlink($dir . '/status.json');
            }

            $message = 'Usunięto raporty z dni: ' . implode(', ', $deleted) . '.';
            if ($notFound !== []) {
                $message .= ' Nie było raportów z dni: ' . implode(', ', $notFound) . '.';
            }

            return ['key' => $key, 'deleted' => $deleted, 'notFound' => $notFound, 'md5' => $md5, 'message' => $message];
        });
    }

    /**
     * @template T
     * @param callable(): T $work
     * @return T
     */
    private function locked(callable $work): mixed
    {
        $this->ensureRoot();
        $lock = fopen($this->root . '/.lock', 'c');
        if ($lock === false) {
            throw new RuntimeException('Nie udało się założyć blokady generowania raportów.');
        }
        if (!flock($lock, LOCK_EX | LOCK_NB)) {
            fclose($lock);
            throw new RuntimeException('Generowanie raportów już trwa — spróbuj za chwilę.');
        }

        try {
            return $work();
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    /**
     * @param array<mixed> $dates
     * @return list<string> unikalne, poprawne daty RRRR-MM-DD, od najstarszej
     */
    private static function validDates(array $dates): array
    {
        $valid = [];
        foreach ($dates as $date) {
            if (!is_string($date) || preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $date, $m) !== 1 || !checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
                throw new RuntimeException('Nieprawidłowa data: ' . (is_scalar($date) ? (string) $date : '?') . ' (wymagany format RRRR-MM-DD).');
            }
            $valid[$date] = true;
        }
        if ($valid === []) {
            throw new RuntimeException('Nie wybrano żadnego dnia.');
        }
        if (count($valid) > 1000) {
            throw new RuntimeException('Za dużo dni naraz (maksymalnie 1000).');
        }
        $valid = array_keys($valid);
        sort($valid);

        return $valid;
    }

    /**
     * Aktualny raport inwestycji bez zapisu czegokolwiek na dysk — ten sam CSV, który powstałby dziś
     * w generate(). Dla zewnętrznych generatorów na stronach inwestycji (ext_price_raport_generator),
     * które publikują własny dataset.xml pod adresem zgłoszonym wcześniej do dane.gov.pl.
     *
     * @return array{key: string, name: string, developer: string, rows: int, csv: string}
     */
    public function currentReport(string $key): array
    {
        $investment = $this->investment($key);
        if (!$investment['published']) {
            throw new RuntimeException("Strona historii cen \"{$investment['name']}\" jest szkicem — raport nie jest publikowany.");
        }
        $prepared = $this->prepare($investment);
        if ($prepared['error'] !== null) {
            throw new RuntimeException($prepared['error']);
        }

        return [
            'key' => $investment['key'],
            'name' => $investment['name'],
            'developer' => $prepared['developer'],
            'rows' => count($prepared['rows']),
            'csv' => $prepared['csv'],
        ];
    }

    /** @return array{key: string, name: string, sourceSlug: string, published: bool, enabled: bool} */
    private function investment(string $key): array
    {
        $this->directory($key); // walidacja klucza
        foreach ($this->discover() as $investment) {
            if ($investment['key'] === $key) {
                return $investment;
            }
        }

        throw new RuntimeException("Nie ma inwestycji z tabelą historii cen o kluczu \"{$key}\".");
    }

    private static function csvName(string $key, string $date): string
    {
        return "ceny-ofertowe-{$key}-{$date}.csv";
    }

    private function writeMd5(string $dir): string
    {
        $md5 = md5_file($dir . '/dataset.xml');
        if ($md5 === false) {
            throw new RuntimeException('Nie udało się policzyć MD5 dla ' . basename($dir) . '/dataset.xml.');
        }
        $this->writeAtomic($dir . '/dataset.md5', $md5);

        return $md5;
    }

    /** @param list<string> $dates usuwa z dataset.xml zasoby z tych dni (dataDate) */
    private function removeResources(string $file, array $dates): void
    {
        $dom = new DOMDocument('1.0', 'UTF-8');
        $dom->preserveWhiteSpace = false;
        $dom->formatOutput = true;
        libxml_use_internal_errors(true);
        if (!$dom->load($file)) {
            $errors = array_map(static fn ($error): string => trim($error->message), libxml_get_errors());
            libxml_clear_errors();
            throw new RuntimeException('Nie udało się wczytać dataset.xml: ' . implode('; ', $errors));
        }

        $xpath = new DOMXPath($dom);
        $remove = array_flip($dates);
        $nodes = [];
        foreach ($xpath->query('//*[local-name()="resources"]/*[local-name()="resource"]') ?: [] as $resource) {
            if ($resource instanceof DOMElement && isset($remove[trim((string) $xpath->evaluate('string(./*[local-name()="dataDate"])', $resource))])) {
                $nodes[] = $resource;
            }
        }
        foreach ($nodes as $node) {
            $node->parentNode?->removeChild($node);
        }
        $this->writeAtomic($file, (string) $dom->saveXML());
    }

    /** @return array<string, string> data RRRR-MM-DD => ścieżka CSV, od najstarszej */
    private function csvDates(string $key): array
    {
        $dir = $this->directory($key);
        $dates = [];
        foreach (is_dir($dir) ? (scandir($dir) ?: []) : [] as $name) {
            if (preg_match('/^ceny-ofertowe-' . preg_quote($key, '/') . '-(\d{4}-\d{2}-\d{2})\.csv$/', $name, $m) === 1) {
                $dates[$m[1]] = $dir . '/' . $name;
            }
        }
        ksort($dates);

        return $dates;
    }

    /** Ostatni CSV sprzed $date (po wcześniejszych uzupełnieniach — także uzupełniony). */
    private function previousCsv(string $key, string $date): ?string
    {
        $found = null;
        foreach ($this->csvDates($key) as $csvDate => $path) {
            if ($csvDate >= $date) {
                break;
            }
            $found = $path;
        }

        return $found;
    }

    /** Deweloper jak w generateOne(): dwie pierwsze kolumny pierwszego wiersza danych. */
    private function developerFromCsv(string $path): string
    {
        $handle = fopen($path, 'r');
        if ($handle === false) {
            return '';
        }
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }
        $header = fgetcsv($handle, null, ';', '"', '');
        $row = fgetcsv($handle, null, ';', '"', '');
        fclose($handle);
        if (!is_array($row)) {
            return '';
        }

        // Struktura 48 pól: pierwsza kolumna "Firma" = pełna firma z formą prawną; stary układ: nazwa + forma prawna.
        return is_array($header) && trim((string) ($header[0] ?? '')) === 'Firma'
            ? trim((string) ($row[0] ?? ''))
            : trim(($row[0] ?? '') . ' ' . ($row[1] ?? ''));
    }

    /** @return list<string> daty zasobów (dataDate) w dataset.xml */
    private function datasetDates(string $file): array
    {
        if (!is_file($file)) {
            return [];
        }
        $dom = new DOMDocument('1.0', 'UTF-8');
        libxml_use_internal_errors(true);
        $loaded = $dom->load($file);
        libxml_clear_errors();
        if (!$loaded) {
            return [];
        }
        $dates = [];
        foreach ((new DOMXPath($dom))->query('//*[local-name()="resource"]/*[local-name()="dataDate"]') ?: [] as $node) {
            $dates[] = trim((string) $node->textContent);
        }

        return $dates;
    }

    // ---------------------------------------------------------------------------------

    /**
     * @param array{key: string, name: string, sourceSlug: string, published: bool, enabled: bool} $investment
     * @return array<string, mixed>
     */
    private function generateOne(array $investment): array
    {
        $key = $investment['key'];
        $dir = $this->directory($key);
        $now = new DateTimeImmutable('now', $this->zone);
        $today = $now->format('Y-m-d');
        $base = $this->statusBase($investment, $now);

        if (!$investment['published']) {
            return $this->finish($dir, $base + ['result' => 'skipped', 'message' => 'Strona historii cen jest szkicem — raport nie jest publikowany.', 'warnings' => []]);
        }

        $prepared = $this->prepare($investment);
        if ($prepared['error'] !== null) {
            return $this->finish($dir, $base + ['result' => 'error', 'message' => $prepared['error'], 'warnings' => $prepared['warnings']]);
        }
        $rows = $prepared['rows'];
        $warnings = $prepared['warnings'];
        $developer = $prepared['developer'];
        $csvName = self::csvName($key, $today);

        $this->ensureDirectory($dir);
        $this->writeAtomic($dir . '/' . $csvName, $prepared['csv']);
        $added = $this->updateDataset($dir . '/dataset.xml', $developer, $today, $this->publicUrl($key, $csvName));
        $md5 = $this->writeMd5($dir);

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

    /**
     * Wiersze raportu z aktualnego rejestru cen (wspólne dla codziennego generowania i regenerateDays()).
     *
     * @param array{key: string, name: string, sourceSlug: string} $investment
     * @return array{error: ?string, csv: string, rows: list<list<string>>, warnings: list<string>, developer: string}
     */
    private function prepare(array $investment): array
    {
        $page = $this->pages->findBySlug($investment['sourceSlug']);
        $section = $page === null ? null : $this->priceHistorySection($page['content']);
        if ($section === null) {
            return ['error' => 'Nie znaleziono tabeli historii cen.', 'csv' => '', 'rows' => [], 'warnings' => [], 'developer' => ''];
        }

        // Rejestr przekształcony do struktury 48 pól (Dz.U. 2026 poz. 1489) — raport w nowym układzie.
        if (self::isCurrentFormat($section['columns'])) {
            [$rows, $warnings, $errors] = $this->buildCurrentRows($section['columns'], $section['rows']);
            if ($errors !== []) {
                return [
                    'error' => 'Raport nie powstał — rejestr cen ma błędy (' . count($errors) . '), które trzeba poprawić przed publikacją: '
                        . implode(' · ', array_slice($errors, 0, 5)) . (count($errors) > 5 ? ' · …' : ''),
                    'csv' => '',
                    'rows' => [],
                    'warnings' => [...array_map(static fn (string $error): string => "BŁĄD: {$error}", $errors), ...$warnings],
                    'developer' => '',
                ];
            }
            if ($rows === []) {
                // Inwestycja sprzedana (np. The Emaus) — raport nadal powstaje codziennie: plik z samymi nagłówkami
                // 48 pól (brak lokali w ofercie). Firma do tytułu zbioru w dataset.xml — z nazwy pliku eksportu rejestru.
                $warnings[] = 'Brak lokali w sprzedaży — raport zawiera tylko nagłówki (inwestycja sprzedana).';

                return ['error' => null, 'csv' => self::currentCsv([]), 'rows' => [], 'warnings' => $warnings, 'developer' => $section['developer']];
            }

            return ['error' => null, 'csv' => self::currentCsv($rows), 'rows' => $rows, 'warnings' => $warnings, 'developer' => $rows[0][0]];
        }

        // Rejestr jeszcze w starym układzie (58 kolumn, 2025) — raport jak dotąd, do czasu przekształcenia rejestru.
        [$rows, $warnings, $missing] = $this->buildRows($section['columns'], $section['rows']);
        $warnings[] = 'Rejestr cen jest jeszcze w starym układzie 58 kolumn — od 11.11.2026 obowiązuje struktura 48 pól (Dz.U. 2026 poz. 1489). Przekształć rejestr, żeby raport powstawał w nowym układzie.';
        if ($missing !== []) {
            return [
                'error' => 'Tabela historii cen (stary układ 58 kolumn) nie ma kolumn: ' . implode(', ', $missing)
                    . '. Przekształć rejestr do struktury 48 pól z Dz.U. 2026 poz. 1489.',
                'csv' => '',
                'rows' => [],
                'warnings' => $warnings,
                'developer' => '',
            ];
        }
        if ($rows === []) {
            return ['error' => 'Tabela historii cen nie ma żadnego wiersza do publikacji.', 'csv' => '', 'rows' => [], 'warnings' => $warnings, 'developer' => ''];
        }

        return ['error' => null, 'csv' => $this->csv($rows), 'rows' => $rows, 'warnings' => $warnings, 'developer' => trim($rows[0][0] . ' ' . $rows[0][1])];
    }

    /** @param list<array<string, mixed>> $columns */
    private static function isCurrentFormat(array $columns): bool
    {
        return in_array(ReportColumns::MARKER, array_map(static fn (array $column): string => (string) ($column['key'] ?? ''), $columns), true);
    }

    /**
     * Wiersze rejestru w strukturze 48 pól -> wartości w formacie wzoru ministerstwa + walidacja.
     * Błędy (pole wymagane puste, "[wprowadz dane]", zły format, niespójne dane lokalu) blokują publikację;
     * ostrzeżenia nie.
     *
     * @param list<array<string, mixed>> $columns
     * @param list<array<string, mixed>> $sourceRows
     * @return array{0: list<list<string>>, 1: list<string>, 2: list<string>} [wiersze, ostrzeżenia, błędy]
     */
    private function buildCurrentRows(array $columns, array $sourceRows): array
    {
        $available = array_map(static fn (array $column): string => (string) ($column['key'] ?? ''), $columns);
        $resolved = [];
        $missing = [];
        foreach (ReportColumns::ALL as $index => $definition) {
            $resolved[$index] = null;
            foreach ([$definition['key'], ...$definition['aliases']] as $candidate) {
                if (in_array($candidate, $available, true)) {
                    $resolved[$index] = $candidate;
                    break;
                }
            }
            if ($resolved[$index] === null) {
                $missing[] = "{$definition['field']} {$definition['header']}";
            }
        }
        if ($missing !== []) {
            return [[], [], ['Rejestr nie ma kolumn: ' . implode('; ', $missing) . '.']];
        }

        $warnings = [];
        $known = array_merge(array_filter($resolved), ReportColumns::RETIRED);
        $unknown = array_values(array_filter(array_diff($available, $known), static fn (string $key): bool => $key !== '' && stripos($key, 'status') === false));
        if ($unknown !== []) {
            $warnings[] = 'Kolumny spoza struktury raportu (pominięte): ' . implode(', ', $unknown) . '.';
        }

        $fieldIndex = array_flip(array_column(ReportColumns::ALL, 'field'));
        $errors = [];
        $rows = [];
        $units = [];
        $ancillaryIds = [];
        $seenRows = [];
        /** @var array<string, list<string>> $grouped problem => numery wierszy */
        $grouped = [];
        foreach ($sourceRows as $number => $source) {
            if (!is_array($source) || self::isSold($source)) {
                continue;
            }
            $row = [];
            $problems = [];
            foreach (ReportColumns::ALL as $index => $definition) {
                $raw = $source[$resolved[$index]] ?? '';
                $raw = is_scalar($raw) ? (string) $raw : '';
                if (preg_match('/\[\s*wprowad[zź]/iu', $raw) === 1) {
                    $problems[] = "{$definition['field']} ({$definition['header']}) — uzupełnij dane (jest „{$raw}”)";
                    $row[] = 'X';
                    continue;
                }
                [$value, $problem] = self::normalizeCurrent($raw, $definition);
                if ($problem !== null) {
                    $problems[] = "{$definition['field']} ({$definition['header']}) — {$problem}";
                }
                $row[] = $value;
            }
            // Wiersz zupełnie pusty (same "X") — np. pozostawiony w panelu szablon.
            if (array_filter($row, static fn (string $value): bool => $value !== 'X') === [] && $problems === []) {
                continue;
            }

            $unit = $row[$fieldIndex['E2']];
            $label = 'Wiersz ' . ($number + 1) . ($unit !== 'X' ? " ({$unit})" : '');

            // F5 / G4 / H4: identyfikator lokalu z E2, gdy grupa jest wypełniona, a pole puste.
            foreach (ReportColumns::UNIT_REFS as $group => [$first, $ref]) {
                $filled = $row[$fieldIndex[$first]] !== 'X';
                if ($filled && $row[$fieldIndex[$ref]] === 'X') {
                    $row[$fieldIndex[$ref]] = $unit;
                } elseif (!$filled && $row[$fieldIndex[$ref]] !== 'X') {
                    $problems[] = "{$ref} — identyfikator lokalu podany bez danych w grupie {$group} (pole {$first} puste)";
                } elseif ($filled && $row[$fieldIndex[$ref]] !== $unit) {
                    $warnings[] = "{$label}: {$ref} wskazuje lokal „{$row[$fieldIndex[$ref]]}”, inny niż identyfikator lokalu w tym wierszu (E2).";
                }
            }

            foreach (ReportColumns::ALL as $index => $definition) {
                if ($definition['required'] && $row[$index] === 'X' && !self::hasProblem($problems, $definition['field'])) {
                    $problems[] = "{$definition['field']} ({$definition['header']}) — pole wymagane jest puste";
                }
            }
            foreach (ReportColumns::DEPENDS_ON as $field => $dependsOn) {
                $has = $row[$fieldIndex[$field]] !== 'X';
                $parent = $row[$fieldIndex[$dependsOn]] !== 'X';
                if ($parent && !$has && !self::hasProblem($problems, $field)) {
                    $problems[] = "{$field} — wymagane, gdy podano {$dependsOn}";
                } elseif ($has && !$parent && !self::hasProblem($problems, $dependsOn)) {
                    $problems[] = "{$field} — podane bez {$dependsOn}";
                }
            }

            // Ten sam problem w wielu wierszach (np. brak współrzędnych — wspólne dla inwestycji) — jeden wpis z listą wierszy.
            foreach ($problems as $problem) {
                $grouped[$problem][] = (string) ($number + 1);
            }

            // Ten sam lokal w kilku wierszach (kolejne pomieszczenia przynależne) — dane lokalu (E1–E6) muszą być identyczne.
            if ($unit !== 'X') {
                $unitData = implode('|', array_slice($row, $fieldIndex['E1'], 6));
                if (isset($units[$unit]) && $units[$unit] !== $unitData) {
                    $errors[] = "{$label}: lokal „{$unit}” występuje w kilku wierszach z różnymi danymi (E1–E6) — muszą być takie same.";
                }
                $units[$unit] ??= $unitData;
            }
            $ancillary = $row[$fieldIndex['F2']];
            if ($ancillary !== 'X') {
                if (isset($ancillaryIds[$ancillary])) {
                    $errors[] = "{$label}: identyfikator pomieszczenia przynależnego „{$ancillary}” (F2) powtarza się — musi być unikalny.";
                }
                $ancillaryIds[$ancillary] = true;
            }
            $signature = implode('|', $row);
            if (isset($seenRows[$signature])) {
                $errors[] = "{$label}: wiersz powtarza wiersz {$seenRows[$signature]}.";
            }
            $seenRows[$signature] ??= (string) ($number + 1);

            $rows[] = $row;
        }

        $rowErrors = [];
        foreach ($grouped as $problem => $numbers) {
            $rowErrors[] = (count($numbers) === 1 ? "Wiersz {$numbers[0]}" : 'Wiersze ' . implode(', ', $numbers)) . ": {$problem}";
        }

        return [$rows, $warnings, [...$rowErrors, ...$errors]];
    }

    /** @param list<string> $problems */
    private static function hasProblem(array $problems, string $field): bool
    {
        foreach ($problems as $problem) {
            if (str_starts_with($problem, $field . ' ')) {
                return true;
            }
        }

        return false;
    }

    /**
     * Wartość pola w formacie wzoru ministerstwa (CSV): kwoty "1500000,44", data i czas "2025-11-09 16:00:00",
     * współrzędne "19,721071", NIP same cyfry, puste = "X".
     *
     * @param array{field: string, key: string, kind: string} $definition
     * @return array{0: string, 1: ?string} [wartość, opis problemu albo null]
     */
    private static function normalizeCurrent(string $raw, array $definition): array
    {
        $value = trim(preg_replace('/\s+/u', ' ', str_replace(["\u{00A0}", "\u{202F}"], ' ', $raw)) ?? '');
        if ($value === '' || $value === '-' || $value === '—' || strcasecmp($value, 'x') === 0) {
            return ['X', null];
        }

        switch ($definition['kind']) {
            case ReportColumns::AMOUNT:
                $number = str_ireplace(['zł', 'pln', ' '], '', $value);
                if (preg_match('/^\d+([.,]\d+)?$/', $number) !== 1) {
                    return [$value, "nieprawidłowa kwota „{$value}”"];
                }

                return [number_format((float) str_replace(',', '.', $number), 2, ',', ''), null];

            case ReportColumns::DATETIME:
                return self::normalizeDateTime($value);

            case ReportColumns::LONGITUDE:
            case ReportColumns::LATITUDE:
                if (preg_match('/^\d{1,3}([.,]\d+)?$/', $value) !== 1) {
                    return [$value, "nieprawidłowa współrzędna „{$value}” (stopnie dziesiętne, np. 19,936000)"];
                }
                $degrees = (float) str_replace(',', '.', $value);
                [$min, $max, $name] = $definition['kind'] === ReportColumns::LONGITUDE ? [14.0, 24.2, 'długość'] : [49.0, 54.9, 'szerokość'];
                if ($degrees < $min || $degrees > $max) {
                    $swapped = $definition['kind'] === ReportColumns::LONGITUDE ? $degrees >= 49.0 && $degrees <= 54.9 : $degrees >= 14.0 && $degrees <= 24.2;

                    return [$value, $swapped ? 'długość i szerokość geograficzna są zamienione (D8 = długość ok. 14–24, D9 = szerokość ok. 49–55)' : "{$name} geograficzna „{$value}” poza Polską"];
                }

                return [number_format($degrees, 6, ',', ''), null];
        }

        if ($definition['field'] === 'A2') {
            $digits = preg_replace('/[\s-]+/', '', $value) ?? '';

            return preg_match('/^\d{10}$/', $digits) === 1 ? [$digits, null] : [$value, "NIP musi mieć 10 cyfr (jest „{$value}”)"];
        }
        if (in_array($definition['field'], ['B8', 'C8', 'D7'], true)) {
            return preg_match('/^\d{2}-\d{3}$/', $value) === 1 ? [$value, null] : [$value, "kod pocztowy musi mieć format NN-NNN (jest „{$value}”)"];
        }
        if (in_array($definition['field'], ['B1', 'C1', 'D1'], true)) {
            return [mb_strtolower($value), null];
        }
        if ($definition['field'] === 'E1') {
            $type = mb_strtolower($value);
            if (str_starts_with($type, 'lokal')) {
                $type = 'lokal mieszkalny';
            } elseif (str_starts_with($type, 'dom')) {
                $type = 'dom jednorodzinny';
            }

            return in_array($type, ReportColumns::PROPERTY_TYPES, true) ? [$type, null] : [$value, "dopuszczalne wartości: „lokal mieszkalny” albo „dom jednorodzinny” (jest „{$value}”)"];
        }

        return [$value, null];
    }

    /** "2026-09-07", "07.09.2026", "2026.09.07 14:30", "2026-09-07T14:30:00" -> "2026-09-07 14:30:00" @return array{0: string, 1: ?string} */
    private static function normalizeDateTime(string $value): array
    {
        $time = [0, 0, 0];
        if (preg_match('/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/', $value, $m) === 1) {
            [$year, $month, $day] = [(int) $m[1], (int) $m[2], (int) $m[3]];
            $time = [(int) ($m[4] ?? 0), (int) ($m[5] ?? 0), (int) ($m[6] ?? 0)];
        } elseif (preg_match('/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})(?: (\d{1,2}):(\d{2})(?::(\d{2}))?)?$/', $value, $m) === 1) {
            [$day, $month, $year] = [(int) $m[1], (int) $m[2], (int) $m[3]];
            $time = [(int) ($m[4] ?? 0), (int) ($m[5] ?? 0), (int) ($m[6] ?? 0)];
        } else {
            return [$value, "nieprawidłowa data „{$value}” (format RRRR-MM-DD GG:MM:SS)"];
        }
        if (!checkdate($month, $day, $year) || $time[0] > 23 || $time[1] > 59 || $time[2] > 59) {
            return [$value, "nieistniejąca data lub godzina „{$value}”"];
        }

        return [sprintf('%04d-%02d-%02d %02d:%02d:%02d', $year, $month, $day, ...$time), null];
    }

    /**
     * CSV jak wzorcowy plik ministerstwa: UTF-8 z BOM, separator ";", wiersze CRLF, nagłówki z ReportColumns.
     * Cudzysłów tylko tam, gdzie wymaga go CSV (";", cudzysłów, nowa linia w wartości).
     *
     * @param list<list<string>> $rows
     */
    private static function currentCsv(array $rows): string
    {
        $line = static fn (array $fields): string => implode(';', array_map(
            static fn (string $field): string => preg_match('/[;"\r\n]/', $field) === 1 ? '"' . str_replace('"', '""', $field) . '"' : $field,
            $fields
        ));
        $lines = [$line(ReportColumns::headers())];
        foreach ($rows as $row) {
            $lines[] = $line($row);
        }

        return "\xEF\xBB\xBF" . implode("\r\n", $lines) . "\r\n";
    }

    /**
     * @param array{key: string, name: string, sourceSlug: string} $investment
     * @return array<string, string>
     */
    private function statusBase(array $investment, DateTimeImmutable $now): array
    {
        return [
            'key' => $investment['key'],
            'name' => $investment['name'],
            'sourceSlug' => $investment['sourceSlug'],
            'generatedAt' => $now->format(DATE_ATOM),
            'datasetUrl' => $this->publicUrl($investment['key'], 'dataset.xml'),
            'md5Url' => $this->publicUrl($investment['key'], 'dataset.md5'),
        ];
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

    /** Dopisuje zasób z dnia $today (albo odtwarza istniejący z tym samym extIdent); $today = data zasobu (backfill / regenerateDays — wybrany dzień). @return bool true = nowy zasób */
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

        $later = null;
        foreach ($xpath->query('./*[local-name()="resource"]', $resources) ?: [] as $resource) {
            if (!$resource instanceof DOMElement) {
                continue;
            }
            $date = $xpath->evaluate('string(./*[local-name()="dataDate"])', $resource);
            if ($date === $today) {
                // Zasób tego dnia już jest — odtworzony od nowa (adres, tytuł, opis), ale z TYM SAMYM extIdent:
                // dla dane.gov.pl to aktualizacja istniejącego zasobu, a nie usunięcie i dodanie nowego.
                $fresh = $this->createResource($dom, $developer, $today, $csvUrl);
                $ident = trim((string) $xpath->evaluate('string(./*[local-name()="extIdent"])', $resource));
                $freshIdent = $fresh->getElementsByTagName('extIdent')->item(0);
                if ($ident !== '' && $freshIdent !== null) {
                    $freshIdent->nodeValue = $ident;
                }
                $resources->replaceChild($fresh, $resource);
                self::sortResources($xpath, $resources);
                $this->writeAtomic($file, (string) $dom->saveXML());

                return false;
            }
            if ($later === null && is_string($date) && $date > $today) {
                $later = $resource;
            }
        }

        // W kolejności dat — uzupełniony dzień (backfill) trafia przed późniejsze zasoby, a nie na koniec.
        $resources->insertBefore($this->createResource($dom, $developer, $today, $csvUrl), $later);
        self::sortResources($xpath, $resources);
        $this->writeAtomic($file, (string) $dom->saveXML());

        return true;
    }

    /** Zasoby w dataset.xml zawsze od najstarszego dnia (dataDate) — jak przy codziennym, bezbłędnym generowaniu. */
    private static function sortResources(DOMXPath $xpath, DOMElement $resources): void
    {
        $items = [];
        foreach ($xpath->query('./*[local-name()="resource"]', $resources) ?: [] as $index => $resource) {
            if ($resource instanceof DOMElement) {
                $items[] = ['date' => (string) $xpath->evaluate('string(./*[local-name()="dataDate"])', $resource), 'index' => $index, 'node' => $resource];
            }
        }
        usort($items, static fn (array $a, array $b): int => [$a['date'], $a['index']] <=> [$b['date'], $b['index']]);
        foreach ($items as $item) {
            $resources->appendChild($item['node']); // przeniesienie istniejącego węzła na koniec = nowa kolejność
        }
    }

    private function createDataset(DOMDocument $dom, string $developer): void
    {
        $root = $dom->createElementNS(self::NAMESPACE, 'ns2:datasets');
        $root->setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:xsi', self::XSI);
        $dom->appendChild($root);

        $dataset = $dom->createElement('dataset');
        $dataset->setAttribute('status', 'published');
        $root->appendChild($dataset);

        $legal = 'art. 19b. ust. 1 Ustawy z dnia 20 maja 2021 r. o ochronie praw nabywcy lokalu mieszkalnego lub domu jednorodzinnego oraz Deweloperskim Funduszu Gwarancyjnym (Dz. U. z 2026 r. poz. 880 i 1077), w strukturze określonej w rozporządzeniu Ministra Cyfryzacji z dnia 10 listopada 2026 r. (Dz. U. poz. 1489)';
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
     * @return array{columns: list<array<string, mixed>>, rows: list<array<string, mixed>>, developer: string}|null
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
            // Firma, gdy rejestr nie ma żadnego lokalu (inwestycja sprzedana): pierwsza niepusta w wierszach,
            // a jeśli wszystkie są puste — nazwa pliku eksportu ("KRJ2 DEVELOPMENT SPÓŁKA Z O… .xlsx").
            $developer = '';
            foreach (is_array($rows) ? $rows : [] as $row) {
                $name = is_array($row) && is_scalar($row['developerName'] ?? null) ? trim((string) $row['developerName']) : '';
                if ($name !== '' && strcasecmp($name, 'x') !== 0 && $name !== '-') {
                    $developer = $name;
                    break;
                }
            }
            if ($developer === '') {
                $export = self::unwrap($fields['exportFileName'] ?? '');
                $developer = is_string($export) ? trim((string) preg_replace('/\.xlsx?$/i', '', $export)) : '';
            }

            return [
                'columns' => array_values(array_filter(is_array($columns) ? $columns : [], 'is_array')),
                'rows' => array_values(is_array($rows) ? $rows : []),
                'developer' => $developer,
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
        $rules = "Options -Indexes\nAddType \"text/csv; charset=utf-8\" .csv\nAddType \"application/xml; charset=utf-8\" .xml\nAddType \"text/plain; charset=utf-8\" .md5\n<FilesMatch \"^(status\\.json|settings\\.json|\\.lock)$\">\n  Require all denied\n</FilesMatch>\n";
        // Nadpisywany przy zmianie reguł (np. nowy plik do ukrycia), nie tylko przy pierwszym uruchomieniu.
        if (!is_file($htaccess) || file_get_contents($htaccess) !== $rules) {
            $this->writeAtomic($htaccess, $rules);
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
