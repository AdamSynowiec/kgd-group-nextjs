<?php

declare(strict_types=1);

namespace App\Http;

use App\Config\Config;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Basic Auth pod panel admina — na razie WYŁĄCZONE domyślnie
 * (ADMIN_AUTH_ENABLED=false), żeby dało się dopracować sam edytor bez
 * logowania się przy każdym teście. Do włączenia: w .env ustaw
 * ADMIN_AUTH_ENABLED=true oraz realne ADMIN_USER/ADMIN_PASS.
 *
 * Dopóki jest wyłączone, panel edycji jest publicznie dostępny dla
 * każdego, kto zna adres — nie zostawiaj tak na docelowej domenie.
 *
 * Nagłówek Authorization jest czytany ręcznie z $_SERVER, nie przez
 * PHP_AUTH_USER/PHP_AUTH_PW — pod php-fpm za nginx te zmienne bywają puste
 * (patrz doświadczenie z .htaccess w tym projekcie: serwer bywa
 * nieprzewidywalny), więc nie polegamy na automatycznym parsowaniu SAPI.
 */
final class BasicAuth
{
    public static function guard(Config $config): void
    {
        if ($config->get('ADMIN_AUTH_ENABLED', 'false') !== 'true') {
            return;
        }

        $expectedUser = $config->get('ADMIN_USER');
        $expectedPass = $config->get('ADMIN_PASS');

        [$user, $pass] = self::credentialsFromRequest();

        $valid = $expectedUser !== ''
            && $user !== null
            && $pass !== null
            && hash_equals($expectedUser, $user)
            && hash_equals($expectedPass, $pass);

        if (!$valid) {
            self::challenge();
        }
    }

    /** @return array{0: string|null, 1: string|null} */
    private static function credentialsFromRequest(): array
    {
        if (isset($_SERVER['PHP_AUTH_USER'])) {
            return [$_SERVER['PHP_AUTH_USER'], $_SERVER['PHP_AUTH_PW'] ?? ''];
        }

        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

        if (!str_starts_with($header, 'Basic ')) {
            return [null, null];
        }

        $decoded = base64_decode(substr($header, strlen('Basic ')), true);
        if ($decoded === false || !str_contains($decoded, ':')) {
            return [null, null];
        }

        [$user, $pass] = explode(':', $decoded, 2);

        return [$user, $pass];
    }

    private static function challenge(): never
    {
        header('WWW-Authenticate: Basic realm="Panel KGD Group"');
        JsonResponse::error(401, 'Wymagane logowanie.');
    }
}
