<?php

declare(strict_types=1);

namespace App\Http;

use App\Config\Config;
use App\Database\Connection;
use App\Exception\ApiException;
use App\Repository\MysqlUserRepository;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Basic Auth pod panel admina, sprawdzane względem tabeli `users` (login +
 * hash hasła + rola) — nie względem stałej pary w .env. Na razie WYŁĄCZONE
 * domyślnie (ADMIN_AUTH_ENABLED=false); do włączenia: ustaw w .env
 * ADMIN_AUTH_ENABLED=true i zasil tabelę `users` (patrz db/005_create_users_table.sql).
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
    /**
     * Zwraca zalogowanego użytkownika (do dalszego sprawdzania roli przez
     * requireRole()) albo null, gdy uwierzytelnianie jest wyłączone —
     * wtedy nie ma żadnego kontekstu użytkownika, więc requireRole() też
     * nic nie blokuje (patrz tam).
     *
     * @return array{id: int, login: string, password: string, role: string}|null
     */
    public static function guard(Config $config): ?array
    {
        if ($config->get('ADMIN_AUTH_ENABLED', 'false') !== 'true') {
            return null;
        }

        [$login, $password] = self::credentialsFromRequest();

        if ($login === null || $password === null) {
            self::challenge();
        }

        $users = new MysqlUserRepository(Connection::get($config));
        $user = $users->findByLogin($login);

        if ($user === null || !password_verify($password, $user['password'])) {
            self::challenge();
        }

        return $user;
    }

    /**
     * Blokuje trasy zastrzeżone dla konkretnej roli (np. "admin" dla
     * przycisku "Zbuduj stronę"). Gdy $user jest null — uwierzytelnianie
     * jest wyłączone, więc nie ma czego porównywać; przepuszcza, tak samo
     * jak reszta panelu w tym trybie developerskim.
     *
     * @param array{id: int, login: string, password: string, role: string}|null $user
     */
    public static function requireRole(?array $user, string $role): void
    {
        if ($user !== null && $user['role'] !== $role) {
            throw new ApiException('Brak uprawnień do tej operacji.', 403);
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
