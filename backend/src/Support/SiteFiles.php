<?php

declare(strict_types=1);

namespace App\Support;

use App\Exception\ApiException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Rejestr plików serwisu edytowanych w panelu (Ustawienia → Pliki serwisu) — mirror
 * SITE_FILES w src/lib/siteFiles.ts. Nowy plik = wpis tutaj i tam + trasa w src/app/<nazwa>/route.ts.
 * Tylko pliki z rejestru da się zapisać albo odczytać — nazwa nigdy nie trafia do ścieżki na dysku.
 */
final class SiteFiles
{
    /** @var array<string, array{maxBytes: int}> */
    public const FILES = [
        'robots.txt' => ['maxBytes' => 65536],
    ];

    public static function exists(string $name): bool
    {
        return isset(self::FILES[$name]);
    }

    /**
     * Treść do zapisu: końce linii "\n", bez spacji na końcu pliku, jedna pusta linia na końcu.
     * Pusta treść = null (powrót do pliku domyślnego).
     */
    public static function normalize(string $name, mixed $content): ?string
    {
        if (!is_string($content)) {
            throw new ApiException('Treść pliku musi być tekstem.', 422);
        }
        $text = rtrim(str_replace(["\r\n", "\r"], "\n", $content));
        if ($text === '') {
            return null;
        }
        if (!mb_check_encoding($text, 'UTF-8') || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $text) === 1) {
            throw new ApiException('Plik może zawierać tylko zwykły tekst (bez znaków sterujących).', 422);
        }
        $max = self::FILES[$name]['maxBytes'];
        if (strlen($text) > $max) {
            throw new ApiException("Plik {$name} może mieć najwyżej " . intdiv($max, 1024) . ' KB.', 422);
        }

        return $text . "\n";
    }
}
