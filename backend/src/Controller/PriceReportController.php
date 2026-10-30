<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\ApiException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\PriceReport\PriceRegisterSync;
use App\PriceReport\PriceReportGenerator;
use App\Repository\ActivityLogRepositoryInterface;
use App\Repository\MysqlPageLockRepository;
use PDOException;
use RuntimeException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * "Raportowanie cen" w Ustawieniach panelu — katalog raportu każdej inwestycji
 * (backend/raporty-cen/<klucz>/), podgląd plików i ręczne generowanie. Codzienne
 * generowanie robi cron (backend/cron.php), ten sam PriceReportGenerator.
 */
final class PriceReportController
{
    /** Podgląd w panelu — większe pliki tylko do pobrania. */
    private const PREVIEW_MAX_BYTES = 2 * 1024 * 1024;

    public function __construct(
        private readonly PriceReportGenerator $generator,
        private readonly ActivityLogRepositoryInterface $activity,
        private readonly ?PriceRegisterSync $sync = null,
        private readonly ?MysqlPageLockRepository $locks = null
    ) {
    }

    /** GET /price-reports/sync?key=foxhills — podgląd: co synchronizacja z ofertą zmieni w rejestrze cen. */
    public function syncPreview(Request $request): void
    {
        $slug = $this->registerSlug($this->key($request->query['key'] ?? null));

        try {
            JsonResponse::ok($this->registerSync()->plan($slug));
        } catch (RuntimeException $exception) {
            throw new ApiException($exception->getMessage(), 409);
        }
    }

    /**
     * POST /price-reports/sync  body: {"key": "foxhills", "ids": ["update:I.W.11", ...], "shared": {...}, "propertyTypes": {...}}
     * — zapis wybranych zmian z podglądu; "shared" (dane dewelopera) i "propertyTypes" (typ z oferty -> rodzaj
     * nieruchomości) z formularza, gdy rejestr ich jeszcze nie ma.
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     */
    public function sync(Request $request, ?array $currentSession): void
    {
        $body = $request->jsonBody();
        $key = $this->key($body['key'] ?? null);
        $ids = array_values(array_filter((array) ($body['ids'] ?? []), 'is_string'));
        $slug = $this->registerSlug($key);

        // Ktoś ma otwarty rejestr w edytorze — jego zapis nadpisałby synchronizację (i odwrotnie).
        try {
            $lock = $this->locks?->current($slug);
        } catch (PDOException $exception) {
            error_log('[page-lock] ' . $exception->getMessage());
            $lock = null;
        }
        if ($lock !== null) {
            throw new ApiException("Historię cen edytuje teraz {$lock['login']} — zamknij edytor tej strony i spróbuj ponownie.", 409);
        }

        try {
            $result = $this->registerSync()->apply(
                $slug,
                $ids,
                is_array($body['shared'] ?? null) ? $body['shared'] : null,
                is_array($body['propertyTypes'] ?? null) ? $body['propertyTypes'] : null
            );
        } catch (RuntimeException $exception) {
            throw new ApiException($exception->getMessage(), 409);
        }

        if ($result['applied'] > 0) {
            $this->activity->log(
                $currentSession['userId'] ?? null,
                $currentSession['login'] ?? null,
                'price-reports.sync',
                $key,
                ['created' => $result['created'], 'updated' => $result['updated'], 'removed' => $result['removed'], 'units' => $result['units']]
            );
        }

        JsonResponse::ok($result);
    }

    private function registerSync(): PriceRegisterSync
    {
        return $this->sync ?? throw new ApiException('Synchronizacja z ofertą jest niedostępna.', 501);
    }

    /** Klucz inwestycji -> adres strony jej rejestru cen. */
    private function registerSlug(string $key): string
    {
        foreach ($this->generator->discover() as $investment) {
            if ($investment['key'] === $key) {
                return $investment['sourceSlug'];
            }
        }

        throw new ApiException('Nie znaleziono inwestycji z rejestrem cen.', 404);
    }

    /** GET /price-reports — inwestycje z tabelą historii cen + stan ich katalogów. */
    public function list(): void
    {
        $items = [];
        foreach ($this->generator->discover() as $investment) {
            $key = $investment['key'];
            $dir = $this->generator->directory($key);
            $files = $this->files($key);
            $csvFiles = array_values(array_filter($files, static fn (array $file): bool => $file['type'] === 'csv'));
            $items[] = $investment + [
                'datasetUrl' => $this->generator->publicUrl($key, 'dataset.xml'),
                'md5Url' => $this->generator->publicUrl($key, 'dataset.md5'),
                'hasDataset' => is_file($dir . '/dataset.xml'),
                'csvCount' => count($csvFiles),
                'lastCsv' => $csvFiles[0]['name'] ?? null,
                'status' => $this->generator->status($key),
            ];
        }

        JsonResponse::ok($items);
    }

    /** GET /price-reports/files?key=rudava-park */
    public function listFiles(Request $request): void
    {
        $key = $this->key($request->query['key'] ?? null);

        JsonResponse::ok([
            'key' => $key,
            'files' => $this->files($key),
            'status' => $this->generator->status($key),
        ]);
    }

    /** GET /price-reports/file?key=rudava-park&name=dataset.xml — treść do podglądu. */
    public function file(Request $request): void
    {
        $key = $this->key($request->query['key'] ?? null);
        $name = (string) ($request->query['name'] ?? '');
        if (preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/', $name) !== 1 || str_contains($name, '..')) {
            throw new ApiException('Nieprawidłowa nazwa pliku.', 400);
        }
        $path = $this->generator->directory($key) . '/' . $name;
        if (!is_file($path)) {
            throw new ApiException('Plik nie istnieje.', 404);
        }
        $size = (int) filesize($path);

        JsonResponse::ok([
            'name' => $name,
            'size' => $size,
            'url' => $this->generator->publicUrl($key, $name),
            'truncated' => $size > self::PREVIEW_MAX_BYTES,
            'content' => (string) file_get_contents($path, false, null, 0, self::PREVIEW_MAX_BYTES),
        ]);
    }

    /**
     * POST /price-reports/generate  body: {"key": "rudava-park"} — albo bez "key" = wszystkie.
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     */
    public function generate(Request $request, ?array $currentSession): void
    {
        $key = $request->jsonBody()['key'] ?? null;
        $key = is_string($key) && $key !== '' ? $this->key($key) : null;

        try {
            $results = $this->generator->generate($key);
        } catch (RuntimeException $exception) {
            throw new ApiException($exception->getMessage(), 409);
        }

        $this->activity->log(
            $currentSession['userId'] ?? null,
            $currentSession['login'] ?? null,
            'price-reports.generate',
            $key ?? 'wszystkie',
            ['results' => array_map(static fn (array $result): string => "{$result['key']}: {$result['result']}", $results)]
        );

        JsonResponse::ok($results);
    }

    /**
     * POST /price-reports/toggle  body: {"key": "rudava-park", "enabled": false, "reason": "Inwestycja zakończona"}
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     */
    public function toggle(Request $request, ?array $currentSession): void
    {
        $body = $request->jsonBody();
        $key = $this->key($body['key'] ?? null);
        if (!is_bool($body['enabled'] ?? null)) {
            throw new ApiException('Brak pola "enabled" (true/false).', 400);
        }
        $reason = is_string($body['reason'] ?? null) ? $body['reason'] : '';

        try {
            $this->generator->setEnabled($key, $body['enabled'], $currentSession['login'] ?? null, $reason);
        } catch (RuntimeException $exception) {
            throw new ApiException($exception->getMessage(), 400);
        }

        $this->activity->log(
            $currentSession['userId'] ?? null,
            $currentSession['login'] ?? null,
            $body['enabled'] ? 'price-reports.enable' : 'price-reports.disable',
            $key,
            $reason !== '' ? ['reason' => $reason] : null
        );

        JsonResponse::ok(['key' => $key, 'enabled' => $body['enabled']]);
    }

    private function key(mixed $key): string
    {
        if (!is_string($key) || preg_match('/^[a-z0-9][a-z0-9-]*$/', $key) !== 1) {
            throw new ApiException('Nieprawidłowy klucz inwestycji.', 400);
        }

        return $key;
    }

    /** @return list<array{name: string, type: string, size: int, modifiedAt: string, url: string}> najnowsze pierwsze */
    private function files(string $key): array
    {
        $dir = $this->generator->directory($key);
        if (!is_dir($dir)) {
            return [];
        }

        $files = [];
        foreach (scandir($dir) ?: [] as $name) {
            // Pliki techniczne (status, tymczasowe zapisu) nie są częścią zbioru danych.
            if ($name === '.' || $name === '..' || str_starts_with($name, '.') || $name === 'status.json' || str_contains($name, '.tmp-')) {
                continue;
            }
            $path = $dir . '/' . $name;
            if (!is_file($path)) {
                continue;
            }
            $files[] = [
                'name' => $name,
                'type' => strtolower(pathinfo($name, PATHINFO_EXTENSION)),
                'size' => (int) filesize($path),
                'modifiedAt' => date(DATE_ATOM, (int) filemtime($path)),
                'url' => $this->generator->publicUrl($key, $name),
            ];
        }

        // dataset.xml i .md5 na górze, potem CSV od najnowszego (data jest w nazwie).
        usort($files, static function (array $a, array $b): int {
            $rank = static fn (array $file): int => $file['type'] === 'csv' ? 1 : 0;

            return [$rank($a), $b['name']] <=> [$rank($b), $a['name']];
        });

        return $files;
    }
}
