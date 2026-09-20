<?php

declare(strict_types=1);

namespace App\Http;

use App\Config\Config;
use App\Exception\IngestException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Autoryzacja zewnętrznego systemu (ingest.php) tokenem "Authorization: Bearer".
 *
 * W .env trzymamy tylko HASHE tokenów (sha256), nie same tokeny:
 *   BLOG_INGEST_TOKENS=firma-2026a:<sha256>,firma-2026b:<sha256>
 * Kilka wpisów naraz = rotacja bez przestoju (dopisz nowy, partner się
 * przełącza, stary usuwasz). Część przed ":" (kid) trafia do logów zamiast tokenu.
 * Brak skonfigurowanych tokenów = zawsze 401 (fail closed).
 */
final class ApiToken
{
    /** @return string kid dopasowanego tokenu */
    public static function authenticate(Config $config): string
    {
        self::requireHttps($config);

        $token = SessionAuth::tokenFromRequest();
        if ($token !== null) {
            $presented = hash('sha256', $token);

            foreach (self::configuredHashes($config) as $kid => $expected) {
                if (hash_equals($expected, $presented)) {
                    return $kid;
                }
            }
        }

        throw new IngestException(401, 'UNAUTHORIZED', 'Invalid or missing API token.');
    }

    /** Token przez HTTP = token do wymiany, więc poza trybem debug nie przyjmujemy go w ogóle. */
    private static function requireHttps(Config $config): void
    {
        $isHttps = ($_SERVER['HTTPS'] ?? 'off') !== 'off'
            || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';

        if (!$isHttps && !$config->isDebug()) {
            throw new IngestException(403, 'INSECURE_TRANSPORT', 'HTTPS is required.');
        }
    }

    /** @return array<string, string> kid => sha256 */
    private static function configuredHashes(Config $config): array
    {
        $hashes = [];

        foreach (explode(',', $config->get('BLOG_INGEST_TOKENS')) as $entry) {
            [$kid, $hash] = array_pad(explode(':', trim($entry), 2), 2, '');
            if ($kid !== '' && $hash !== '') {
                $hashes[$kid] = strtolower($hash);
            }
        }

        return $hashes;
    }
}
