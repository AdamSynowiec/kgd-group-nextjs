<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\ApiException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Http\SessionToken;
use App\Repository\ActivityLogRepositoryInterface;
use App\Repository\PermissionRepositoryInterface;
use App\Repository\UserRepositoryInterface;
use JsonException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/** Jedyna publiczna trasa panelu — na niej dopiero powstaje sesja, więc nie jest chroniona przez SessionAuth::guard(). */
final class AuthController
{
    /**
     * Limit nieudanych logowań w oknie LOCK_SECONDS: dla pary login + IP (zgadywanie hasła jednego
     * konta) i dla samego IP (przechodzenie po wielu loginach). Celowo nie dla samego loginu — wtedy
     * każdy mógłby zablokować cudze konto, wpisując złe hasło.
     */
    private const MAX_FAILURES_PER_LOGIN = 5;
    private const MAX_FAILURES_PER_IP = 20;
    private const LOCK_SECONDS = 900;

    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly SessionToken $tokens,
        private readonly PermissionRepositoryInterface $permissions,
        private readonly ActivityLogRepositoryInterface $activity
    ) {
    }

    /** POST /login, body: {"login": "...", "password": "..."} */
    public function login(Request $request): void
    {
        try {
            $body = $request->jsonBody();
        } catch (JsonException) {
            throw new ApiException('Niepoprawny JSON.', 400);
        }

        $login = $body['login'] ?? null;
        $password = $body['password'] ?? null;

        if (!is_string($login) || !is_string($password) || $login === '' || $password === '') {
            throw new ApiException('Podaj login i hasło.', 400);
        }

        // Przed sprawdzeniem hasła — w czasie blokady nawet poprawne hasło nie przechodzi, inaczej dalej dałoby się zgadywać.
        if (
            $this->activity->countRecentFromClient('auth.login_failed', self::LOCK_SECONDS, $login) >= self::MAX_FAILURES_PER_LOGIN
            || $this->activity->countRecentFromClient('auth.login_failed', self::LOCK_SECONDS) >= self::MAX_FAILURES_PER_IP
        ) {
            throw new ApiException('Zbyt wiele nieudanych prób logowania. Spróbuj ponownie za 15 minut albo ustaw nowe hasło („Nie pamiętasz hasła?”).', 429);
        }

        $user = $this->users->findByLogin($login);

        if ($user === null || !password_verify($password, $user['password'])) {
            // "auth.login_failed" celowo loguje PRÓBOWANY login, nie hasło —
            // przydatne do wykrycia np. prób odgadywania loginów/haseł.
            $this->activity->log(null, $login, 'auth.login_failed');

            throw new ApiException('Nieprawidłowy login lub hasło.', 401);
        }

        $this->activity->log($user['id'], $user['login'], 'auth.login');

        $token = $this->tokens->issue([
            'userId' => $user['id'],
            'login' => $user['login'],
            'role' => $user['role'],
        ]);

        // "permissions" tutaj oszczędza panelowi obowiązkowego dodatkowego
        // zapytania (GET /me) zaraz po zalogowaniu — token i tak niesie tylko
        // tożsamość, nie jest źródłem prawdy o uprawnieniach (patrz
        // Authorization.php); ta lista jest jednorazowym zrzutem stanu w
        // momencie logowania, panel odświeża ją przez GET /me po każdej
        // zmianie ról/uprawnień, żeby nie wymagać przelogowania.
        JsonResponse::ok([
            'token' => $token,
            'user' => [
                'login' => $user['login'],
                'role' => $user['role'],
                'permissions' => $this->permissions->effectivePermissions($user['id'], $user['role']),
            ],
        ]);
    }
}
