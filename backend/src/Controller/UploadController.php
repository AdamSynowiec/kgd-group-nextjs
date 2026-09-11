<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\ApiException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\ActivityLogRepositoryInterface;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Upload plików z panelu (pola typu "asset" — zdjęcia/ikony w EditableField.tsx).
 * Plik trafia do backend/uploads/ (obok index.php/admin.php), NIE do Next.js
 * public/ — ten katalog nie jest częścią statycznego builda (out/), więc
 * wgrany plik byłby utracony przy najbliższym "npm run build" / deployu.
 * uploads/ na serwerze przeżywa kolejne deploye z tego samego powodu co
 * .env — CI kopiuje do out/api/ tylko index.php/admin.php/.htaccess/src
 * (patrz .github/workflows/deploy.yml), a FTP-Deploy-Action bez clean-slate
 * nie kasuje plików, których nie ma lokalnie.
 *
 * Zwraca URL względny od korzenia domeny ("/api/uploads/<plik>") — działa,
 * bo backend i statyczna strona żyją pod tą samą domeną (patrz adminApi.ts).
 */
final class UploadController
{
    private const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

    /** rozszerzenie -> lista dopuszczalnych MIME z finfo (weryfikacja realnej zawartości, nie tylko nazwy pliku). */
    private const ALLOWED_TYPES = [
        'jpg' => ['image/jpeg'],
        'jpeg' => ['image/jpeg'],
        'png' => ['image/png'],
        'webp' => ['image/webp'],
        'gif' => ['image/gif'],
        // SVG celowo bez weryfikacji finfo (to XML, nie da się sprawdzić po MIME
        // równie prosto) — panel jest dostępny tylko zalogowanym redaktorom,
        // ten sam poziom zaufania co reszta treści w bazie.
        'svg' => null,
    ];

    public function __construct(private readonly ActivityLogRepositoryInterface $activity)
    {
    }

    /** @param array{userId: int, login: string, role: string, exp: int}|null $currentSession */
    public function upload(Request $request, ?array $currentSession): void
    {
        $file = $request->files['file'] ?? null;

        if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            throw new ApiException('Nie przesłano pliku (oczekiwane pole "file").', 400);
        }

        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new ApiException('Błąd podczas przesyłania pliku (kod ' . $file['error'] . ').', 400);
        }

        if (!is_uploaded_file($file['tmp_name'])) {
            throw new ApiException('Nieprawidłowe żądanie przesyłania pliku.', 400);
        }

        if ($file['size'] > self::MAX_BYTES) {
            throw new ApiException('Plik jest za duży — limit to 8 MB.', 400);
        }

        $extension = strtolower(pathinfo((string) $file['name'], PATHINFO_EXTENSION));
        if (!array_key_exists($extension, self::ALLOWED_TYPES)) {
            throw new ApiException(
                'Niedozwolony typ pliku. Dozwolone: ' . implode(', ', array_keys(self::ALLOWED_TYPES)) . '.',
                400
            );
        }

        $allowedMimes = self::ALLOWED_TYPES[$extension];
        if ($allowedMimes !== null) {
            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $detectedMime = $finfo->file($file['tmp_name']) ?: '';
            if (!in_array($detectedMime, $allowedMimes, true)) {
                throw new ApiException('Zawartość pliku nie zgadza się z jego rozszerzeniem.', 400);
            }
        }

        $uploadsDir = __DIR__ . '/../../uploads';
        if (!is_dir($uploadsDir) && !mkdir($uploadsDir, 0755, true) && !is_dir($uploadsDir)) {
            throw new ApiException('Nie udało się utworzyć katalogu na pliki.', 500);
        }

        // Losowa nazwa — bez pytania o oryginalną, więc żadnych kolizji ani
        // przejścia po ścieżce (path traversal) z nazwy pliku klienta.
        $filename = bin2hex(random_bytes(16)) . '.' . $extension;
        $destination = $uploadsDir . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            throw new ApiException('Nie udało się zapisać pliku na serwerze.', 500);
        }

        $this->activity->log(
            $currentSession['userId'] ?? null,
            $currentSession['login'] ?? null,
            'assets.upload',
            $filename,
            ['originalName' => (string) $file['name'], 'size' => (int) $file['size']]
        );

        JsonResponse::ok(['url' => '/api/uploads/' . $filename]);
    }
}
