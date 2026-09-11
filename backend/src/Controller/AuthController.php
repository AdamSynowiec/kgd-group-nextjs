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
