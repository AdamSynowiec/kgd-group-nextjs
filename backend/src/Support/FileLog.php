<?php

declare(strict_types=1);

namespace App\Support;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Prosty log do pliku obok backendu (backend/logs/app.log.php) — dla hostingów,
 * gdzie error_log() PHP-a idzie w miejsce niedostępne dla klienta.
 *
 * Bezpieczeństwo: plik ma rozszerzenie .php i pierwszą linię
 * `<?php http_response_code(404); exit; ?>`, więc otwarty w przeglądarce
 * zwraca 404 zamiast treści (działa też bez Apache/.htaccess). Dodatkowo
 * katalog dostaje .htaccess z zakazem dostępu. Podgląd: przez FTP/menedżer plików.
 *
 * Nie loguj tu danych osobowych (imię, e-mail, telefon, treść wiadomości)
 * ani haseł — tylko statusy i komunikaty błędów.
 */
final class FileLog
{
    private const FILE = 'app.log.php';
    private const HEADER = "<?php http_response_code(404); exit; ?>\n";
    private const MAX_BYTES = 262144; // po przekroczeniu zostaje ostatnia połowa

    public static function write(string $channel, string $message): void
    {
        $line = sprintf(
            "%s [%s] %s\n",
            (new \DateTimeImmutable('now', new \DateTimeZone('Europe/Warsaw')))->format('Y-m-d H:i:s'),
            $channel,
            str_replace(["\r", "\n"], ' ', $message)
        );

        // Zawsze też do standardowego logu PHP — jeśli plik się nie uda, wpis nie przepada.
        error_log("[{$channel}] {$message}");

        try {
            $dir = dirname(__DIR__, 2) . '/logs';
            if (!is_dir($dir) && !@mkdir($dir, 0750, true) && !is_dir($dir)) {
                return;
            }

            $htaccess = $dir . '/.htaccess';
            if (!is_file($htaccess)) {
                @file_put_contents($htaccess, "Require all denied\n<IfModule !mod_authz_core.c>\nOrder allow,deny\nDeny from all\n</IfModule>\n");
            }

            $path = $dir . '/' . self::FILE;
            if (!is_file($path)) {
                @file_put_contents($path, self::HEADER, LOCK_EX);
            } elseif ((int) @filesize($path) > self::MAX_BYTES) {
                self::trim($path);
            }

            @file_put_contents($path, $line, FILE_APPEND | LOCK_EX);
        } catch (\Throwable) {
            // Logowanie nigdy nie może zepsuć obsługi żądania.
        }
    }

    private static function trim(string $path): void
    {
        $content = (string) @file_get_contents($path);
        $tail = substr($content, (int) (strlen($content) / 2));
        $newline = strpos($tail, "\n");
        $tail = $newline === false ? '' : substr($tail, $newline + 1);

        @file_put_contents($path, self::HEADER . $tail, LOCK_EX);
    }
}
