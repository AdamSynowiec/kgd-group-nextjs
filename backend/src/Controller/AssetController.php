<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\ApiException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\ActivityLogRepositoryInterface;
use App\Repository\MysqlAssetRepository;
use JsonException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * "Assets" w panelu — biblioteka plików z api/uploads/ (db/034_create_assets.sql): katalogi,
 * przenoszenie, zmiana nazw, usuwanie i wybór pliku do pola. Katalogi żyją tylko w bazie —
 * adres pliku (/api/uploads/<filename>) nie zmienia się nigdy, więc strony się nie psują.
 */
final class AssetController
{
    /** Pliki zapisywane przez UploadController: 32 znaki hex + rozszerzenie. */
    private const FILENAME = '/^[a-f0-9]{32}\.[a-z0-9]{2,5}$/';

    private readonly string $uploadsDir;

    public function __construct(
        private readonly MysqlAssetRepository $assets,
        private readonly ActivityLogRepositoryInterface $activity
    ) {
        $this->uploadsDir = dirname(__DIR__, 2) . '/uploads';
    }

    /** GET /assets?folder=<id>|root&q=... — katalogi (całe drzewo) + pliki katalogu albo wyniki wyszukiwania. */
    public function list(Request $request): void
    {
        $this->sync();
        $query = trim((string) ($request->query['q'] ?? ''));
        $folderId = self::optionalId($request->query['folder'] ?? null);

        JsonResponse::ok([
            'folders' => $this->assets->folders(),
            'folderId' => $folderId,
            'assets' => $this->assets->assets($folderId, $query),
        ]);
    }

    /** POST /assets/folders  {"name": "Fox Hills", "parentId": null} */
    public function createFolder(Request $request, ?array $session): void
    {
        $body = self::body($request);
        $name = self::name($body['name'] ?? null, 120);
        $parentId = self::optionalId($body['parentId'] ?? null);
        if ($parentId !== null && $this->assets->folder($parentId) === null) {
            throw new ApiException('Nie ma takiego katalogu nadrzędnego.', 404);
        }
        if ($this->assets->folderNameTaken($parentId, $name)) {
            throw new ApiException("Katalog „{$name}” już tu jest.", 409);
        }
        $id = $this->assets->createFolder($parentId, $name);
        $this->log($session, 'assets.folder.create', $name);

        JsonResponse::ok(['id' => $id, 'folders' => $this->assets->folders()]);
    }

    /** POST /assets/folders/update  {"id": 3, "name"?: "...", "parentId"?: 5|null} — zmiana nazwy i/lub przeniesienie. */
    public function updateFolder(Request $request, ?array $session): void
    {
        $body = self::body($request);
        $id = self::requiredId($body['id'] ?? null);
        $folder = $this->assets->folder($id) ?? throw new ApiException('Nie ma takiego katalogu.', 404);

        $name = array_key_exists('name', $body) ? self::name($body['name'], 120) : $folder['name'];
        $parentId = array_key_exists('parentId', $body) ? self::optionalId($body['parentId']) : $folder['parentId'];
        if ($parentId !== null && ($this->assets->folder($parentId) === null || $this->assets->isWithin($parentId, $id))) {
            throw new ApiException('Nie można przenieść katalogu do niego samego ani do jego podkatalogu.', 422);
        }
        if ($this->assets->folderNameTaken($parentId, $name, $id)) {
            throw new ApiException("Katalog „{$name}” już tam jest.", 409);
        }
        $this->assets->updateFolder($id, $name, $parentId);
        $this->log($session, 'assets.folder.update', $name);

        JsonResponse::ok(['folders' => $this->assets->folders()]);
    }

    /** DELETE /assets/folders?id=3 — pliki i podkatalogi przechodzą piętro wyżej. */
    public function deleteFolder(Request $request, ?array $session): void
    {
        $id = self::requiredId($request->query['id'] ?? null);
        $folder = $this->assets->folder($id) ?? throw new ApiException('Nie ma takiego katalogu.', 404);
        $this->assets->deleteFolder($id);
        $this->log($session, 'assets.folder.delete', $folder['name']);

        JsonResponse::ok(['folders' => $this->assets->folders()]);
    }

    /** POST /assets/update  {"ids": [1, 2], "folderId": 3|null} (przeniesienie) albo {"id": 1, "name": "..."} (nazwa). */
    public function update(Request $request, ?array $session): void
    {
        $body = self::body($request);

        if (array_key_exists('name', $body)) {
            $id = self::requiredId($body['id'] ?? null);
            $this->assets->find($id) ?? throw new ApiException('Nie ma takiego pliku.', 404);
            $this->assets->rename($id, self::name($body['name'], 255));
            JsonResponse::ok($this->assets->find($id));
        }

        $ids = array_values(array_unique(array_map(static fn ($id): int => self::requiredId($id), is_array($body['ids'] ?? null) ? $body['ids'] : [])));
        if ($ids === []) {
            throw new ApiException('Brak plików do przeniesienia.', 400);
        }
        $folderId = self::optionalId($body['folderId'] ?? null);
        if ($folderId !== null && $this->assets->folder($folderId) === null) {
            throw new ApiException('Nie ma takiego katalogu.', 404);
        }
        $this->assets->move($ids, $folderId);
        $this->log($session, 'assets.move', (string) count($ids));

        JsonResponse::ok(['moved' => count($ids)]);
    }

    /** GET /assets/usage?id=1 — strony, w których treści plik występuje. */
    public function usage(Request $request): void
    {
        $asset = $this->assets->find(self::requiredId($request->query['id'] ?? null)) ?? throw new ApiException('Nie ma takiego pliku.', 404);
        JsonResponse::ok(['pages' => $this->assets->usage($asset['filename'])]);
    }

    /** DELETE /assets?id=1[&force=1] — bez force odmawia (409), gdy plik jest używany na jakiejś stronie. */
    public function delete(Request $request, ?array $session): void
    {
        $asset = $this->assets->find(self::requiredId($request->query['id'] ?? null)) ?? throw new ApiException('Nie ma takiego pliku.', 404);
        $pages = $this->assets->usage($asset['filename']);
        if ($pages !== [] && ($request->query['force'] ?? '') !== '1') {
            JsonResponse::send(['error' => ['status' => 409, 'message' => 'Plik jest używany na stronach: ' . implode(', ', $pages) . '.', 'pages' => $pages]], 409);
        }

        if (preg_match(self::FILENAME, $asset['filename']) === 1 && is_file($this->uploadsDir . '/' . $asset['filename'])) {
            if (!@unlink($this->uploadsDir . '/' . $asset['filename'])) {
                throw new ApiException('Nie udało się usunąć pliku z serwera.', 500);
            }
        }
        $this->assets->delete($asset['id']);
        $this->log($session, 'assets.delete', $asset['name'], ['filename' => $asset['filename'], 'usedOn' => $pages]);

        JsonResponse::ok(['deleted' => true]);
    }

    /** Zapis nowo wgranego pliku w bibliotece (UploadController). Błąd bazy nie psuje samego uploadu. */
    public static function register(MysqlAssetRepository $assets, string $path, string $originalName, ?int $folderId, ?string $login): ?int
    {
        try {
            if ($folderId !== null && $assets->folder($folderId) === null) {
                $folderId = null;
            }

            return $assets->insert(['filename' => basename($path), 'name' => self::cleanName($originalName, basename($path)), 'folderId' => $folderId, 'uploadedBy' => $login] + self::describe($path));
        } catch (\Throwable) {
            return null;
        }
    }

    /** Pliki z api/uploads/, których biblioteka jeszcze nie zna (wgrane przed nią), dopisują się do najwyższego poziomu. */
    private function sync(): void
    {
        if (!is_dir($this->uploadsDir)) {
            return;
        }
        $known = array_flip($this->assets->knownFilenames());
        foreach (scandir($this->uploadsDir) ?: [] as $filename) {
            if (isset($known[$filename]) || preg_match(self::FILENAME, $filename) !== 1) {
                continue;
            }
            $path = $this->uploadsDir . '/' . $filename;
            $name = $this->assets->originalNameFromLog($filename) ?? $filename;
            $this->assets->insert(['filename' => $filename, 'name' => self::cleanName($name, $filename), 'folderId' => null, 'uploadedBy' => null, 'createdAt' => (int) filemtime($path)] + self::describe($path));
        }
    }

    /** @return array{mime: ?string, size: int, width: ?int, height: ?int} */
    private static function describe(string $path): array
    {
        $mime = is_file($path) ? ((new \finfo(FILEINFO_MIME_TYPE))->file($path) ?: null) : null;
        $size = @getimagesize($path);

        return [
            'mime' => $mime,
            'size' => is_file($path) ? (int) filesize($path) : 0,
            'width' => is_array($size) ? (int) $size[0] : null,
            'height' => is_array($size) ? (int) $size[1] : null,
        ];
    }

    private static function cleanName(string $name, string $fallback): string
    {
        $clean = trim(preg_replace('/[\x00-\x1F\x7F]+/u', '', $name) ?? '');

        return $clean === '' ? $fallback : mb_substr($clean, 0, 255);
    }

    /** @return array<string, mixed> */
    private static function body(Request $request): array
    {
        try {
            return $request->jsonBody();
        } catch (JsonException) {
            throw new ApiException('Niepoprawny JSON.', 400);
        }
    }

    private static function name(mixed $raw, int $max): string
    {
        $name = is_string($raw) ? trim(preg_replace('/[\x00-\x1F\x7F\/\\\\]+/u', '', $raw) ?? '') : '';
        if ($name === '') {
            throw new ApiException('Nazwa nie może być pusta.', 422);
        }

        return mb_substr($name, 0, $max);
    }

    private static function requiredId(mixed $raw): int
    {
        $id = filter_var($raw, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($id === false) {
            throw new ApiException('Nieprawidłowy identyfikator.', 400);
        }

        return $id;
    }

    private static function optionalId(mixed $raw): ?int
    {
        return $raw === null || $raw === '' || $raw === 'root' ? null : self::requiredId($raw);
    }

    /** @param array{userId: int, login: string, role: string, exp: int}|null $session */
    private function log(?array $session, string $action, string $target, array $details = []): void
    {
        $this->activity->log($session['userId'] ?? null, $session['login'] ?? null, $action, $target, $details === [] ? null : $details);
    }
}
