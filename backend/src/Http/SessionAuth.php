<?php

declare(strict_types=1);

namespace App\Http;

use App\Config\Config;
use App\Exception\ApiException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Strażnik tras panelu — sprawdza token sesji (nagłówek "Authorization: Bearer <token>"),
 * wystawiony przez AuthController::login() (patrz SessionToken.php). Na razie
 * WYŁĄCZONY domyślnie (ADMIN_AUTH_ENABLED=false); do włączenia: w .env ustaw
 * ADMIN_AUTH_ENABLED=true, SESSION_SECRET (patrz backend/tools/generate-secret.php)
 * i zasil tabelę `users` (patrz db/005_create_users_table.sql).
 *
 * Dopóki jest wyłączone, panel jest publicznie dostępny dla każdego, kto zna
 * adres — nie zostawiaj tak na docelowej domenie.
 *
 * Świadomie schemat "Bearer", nie "Basic": przeglądarki same interweniują
 * (pokazują własne, natywne okienko logowania) na widok nagłówka
 * WWW-Authenticate ze schematem Basic/Digest w odpowiedzi 401 — nawet gdy
 * żądanie idzie przez fetch(), nie przez zwykłą nawigację. "Bearer" nie jest
 * rozpoznawany przez przeglądarki jako interaktywny schemat auth, więc tego
 * efektu ubocznego nie ma; logowanie w całości obsługuje własny UI aplikacji.
 */
final class SessionAuth
{
    /**
     * Zwraca dane sesji (do dalszego sprawdzania roli przez requireRole())
     * albo null, gdy uwierzytelnianie jest wyłączone — wtedy nie ma żadnego
     * kontekstu użytkownika, więc requireRole() też nic nie blokuje.
     *
     * @return array{userId: int, login: string, role: string, exp: int}|null
     */
    public static function guard(Config $config): ?array
    {
        if ($config->get('ADMIN_AUTH_ENABLED', 'false') !== 'true') {
            return null;
        }

        $token = self::tokenFromRequest();

        if ($token === null) {
            JsonResponse::error(401, 'Wymagane logowanie.');
        }

        $claims = (new SessionToken($config->get('SESSION_SECRET')))->verify($token);

        if ($claims === null) {
            JsonResponse::error(401, 'Sesja wygasła lub jest nieprawidłowa — zaloguj się ponownie.');
        }

        /** @var array{userId: int, login: string, role: string, exp: int} $claims */
        return $claims;
    }

    /**
     * Blokuje trasy zastrzeżone dla konkretnej roli. Gdy $session jest null —
     * uwierzytelnianie jest wyłączone, więc nie ma czego porównywać; przepuszcza,
     * tak samo jak reszta panelu w tym trybie developerskim.
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $session
     */
    public static function requireRole(?array $session, string $role): void
    {
        if ($session !== null && $session['role'] !== $role) {
            throw new ApiException('Brak uprawnień do tej operacji.', 403);
        }
    }

    private static function tokenFromRequest(): ?string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

        if (!str_starts_with($header, 'Bearer ')) {
            return null;
        }

        $token = substr($header, strlen('Bearer '));

        return $token !== '' ? $token : null;
    }
}
