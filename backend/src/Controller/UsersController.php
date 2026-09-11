<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\ApiException;
use App\Exception\NotFoundException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\ActivityLogRepositoryInterface;
use App\Repository\PermissionRepositoryInterface;
use App\Repository\RoleRepositoryInterface;
use App\Repository\UserRepositoryInterface;
use JsonException;
use PDOException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Zarządzanie kontami panelu (sekcja "Ustawienia" w /admin) — dodawanie i
 * usuwanie użytkowników. listUsers/createUser/deleteUser wymagają
 * uprawnienia "users.list"/"users.create"/"users.delete" (patrz admin.php:
 * Authorization::require() przed wywołaniem tych metod, patrz
 * Authorization.php) — sam kontroler i tak dodatkowo pilnuje dwóch rzeczy,
 * których żadna rola nie powinna móc zrobić przez pomyłkę: usunięcia
 * własnego konta i usunięcia ostatniego AKTYWNEGO konta "admin" (patrz
 * PermissionRepositoryInterface::countActiveAdmins() — konto liczy się jako
 * "aktywne", jeśli nie ma indywidualnego "deny" na uprawnienia potrzebne do
 * naprawienia dostępu, patrz PermissionRegistry::CRITICAL).
 *
 * updateOwnAccount() jest INNA — celowo BEZ wymogu żadnego uprawnienia
 * (patrz jej komentarz i admin.php) — to nie operacja na cudzych danych.
 */
final class UsersController
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly RoleRepositoryInterface $roles,
        private readonly PermissionRepositoryInterface $permissions,
        private readonly ActivityLogRepositoryInterface $activity
    ) {
    }

    /** GET /users — lista kont (bez hasła) pod panel ustawień. */
    public function listUsers(): void
    {
        JsonResponse::ok($this->users->listAll());
    }

    /**
     * POST /users, body: {"login": "...", "password": "...", "role": "<nazwa techniczna roli z tabeli roles>"}
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     */
    public function createUser(Request $request, ?array $currentSession): void
    {
        try {
            $body = $request->jsonBody();
        } catch (JsonException) {
            throw new ApiException('Niepoprawny JSON.', 400);
        }

        $login = is_string($body['login'] ?? null) ? trim($body['login']) : '';
        $password = $body['password'] ?? null;
        $role = is_string($body['role'] ?? null) ? $body['role'] : '';

        if ($login === '') {
            throw new ApiException('Podaj login.', 400);
        }

        if (!is_string($password) || mb_strlen($password) < 8) {
            throw new ApiException('Hasło musi mieć co najmniej 8 znaków.', 400);
        }

        // Role są teraz dynamiczne (patrz db/010_create_roles_table.sql,
        // RolesController) — zamiast zaszytej listy ["admin", "editor"]
        // sprawdzamy, że rola realnie istnieje w tabeli `roles`.
        if (!$this->roles->exists($role)) {
            throw new ApiException('Nieznana rola — najpierw utwórz ją w sekcji "Role".', 400);
        }

        try {
            $user = $this->users->create($login, password_hash($password, PASSWORD_DEFAULT), $role);
        } catch (PDOException $exception) {
            if ($exception->getCode() === '23000') {
                throw new ApiException('Ten login jest już zajęty.', 409);
            }

            throw $exception;
        }

        $this->activity->log($currentSession['userId'] ?? null, $currentSession['login'] ?? null, 'users.create', $login, ['role' => $role]);

        JsonResponse::ok($user);
    }

    /**
     * DELETE /users?id=... — usuwa konto. $currentSession jest null tylko
     * wtedy, gdy uwierzytelnianie panelu jest wyłączone (ADMIN_AUTH_ENABLED=false)
     * — w tym trybie nie ma tożsamości, więc strażnik "nie usuwaj samego siebie"
     * nie ma czego pilnować.
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     */
    public function deleteUser(Request $request, ?array $currentSession): void
    {
        $id = $this->idFromQuery($request);
        $target = $this->users->findById($id);

        if ($target === null) {
            throw new NotFoundException("Nie znaleziono konta o id {$id}.");
        }

        if ($currentSession !== null && $currentSession['userId'] === $id) {
            throw new ApiException('Nie możesz usunąć własnego konta.', 400);
        }

        if ($target['role'] === 'admin' && $this->permissions->countActiveAdmins() <= 1) {
            throw new ApiException('Nie można usunąć ostatniego aktywnego konta z rolą "admin".', 400);
        }

        $this->users->delete($id);

        $this->activity->log($currentSession['userId'] ?? null, $currentSession['login'] ?? null, 'users.delete', $target['login']);

        JsonResponse::ok(['deleted' => true, 'id' => $id]);
    }

    /**
     * POST /account, body: {"currentPassword": "...", "email"?: "...", "newPassword"?: "..."}
     * Samoobsługowa zmiana WŁASNEGO adresu email i/lub hasła — NIGDY cudzego
     * konta: cel jest zawsze $currentSession['userId'] z tokenu, nigdy z
     * ciała żądania (nie ma tu parametru "id" do sfałszowania). Dlatego ta
     * trasa celowo nie wymaga żadnego uprawnienia z PermissionRegistry
     * (patrz admin.php) — rola/deny mają sens tylko przy operacjach na
     * cudzych danych, a "zmień swoje własne hasło" nie jest taką operacją.
     *
     * Realnym zabezpieczeniem jest wymóg podania OBECNEGO hasła
     * (password_verify()) przy KAŻDEJ zmianie (także samego e-maila) —
     * broni przed np. pozostawioną otwartą sesją w przeglądarce. Zmiana
     * e-maila nie wysyła żadnego potwierdzenia (brak infrastruktury
     * mailowej w tym backendzie) — akceptowane świadomie, konto i tak
     * wymaga ponownego podania hasła.
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     */
    public function updateOwnAccount(Request $request, ?array $currentSession): void
    {
        if ($currentSession === null) {
            // Nie "przepuszczaj wszystko" jak przy innych trasach w trybie
            // ADMIN_AUTH_ENABLED=false — bez sesji nie ma "własnego konta"
            // do zmiany w ogóle.
            throw new ApiException('Ta operacja wymaga zalogowania.', 400);
        }

        $user = $this->users->findById($currentSession['userId']);
        if ($user === null) {
            throw new ApiException('Sesja nieważna — zaloguj się ponownie.', 401);
        }

        try {
            $body = $request->jsonBody();
        } catch (JsonException) {
            throw new ApiException('Niepoprawny JSON.', 400);
        }

        $currentPassword = $body['currentPassword'] ?? null;
        $email = $body['email'] ?? null;
        $newPassword = $body['newPassword'] ?? null;

        if (!is_string($currentPassword) || $currentPassword === '') {
            throw new ApiException('Podaj obecne hasło, aby potwierdzić zmianę.', 400);
        }

        if (!password_verify($currentPassword, $user['password'])) {
            throw new ApiException('Nieprawidłowe obecne hasło.', 400);
        }

        if ($email === null && $newPassword === null) {
            throw new ApiException('Podaj nowy adres email lub nowe hasło.', 400);
        }

        if ($email !== null) {
            if (!is_string($email) || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
                throw new ApiException('Nieprawidłowy adres email.', 400);
            }

            try {
                $this->users->updateEmail($user['id'], $email);
            } catch (PDOException $exception) {
                if ($exception->getCode() === '23000') {
                    throw new ApiException('Ten adres email jest już używany przez inne konto.', 409);
                }

                throw $exception;
            }
        }

        if ($newPassword !== null) {
            if (!is_string($newPassword) || mb_strlen($newPassword) < 8) {
                throw new ApiException('Nowe hasło musi mieć co najmniej 8 znaków.', 400);
            }

            $this->users->updatePassword($user['id'], password_hash($newPassword, PASSWORD_DEFAULT));
        }

        $updated = $this->users->findById($user['id']);

        // "details" niesie TYLKO fakt zmiany (bool), nigdy nowe hasło ani jego hash — patrz db/013_create_activity_log.sql.
        $this->activity->log($user['id'], $user['login'], 'account.update', $email, [
            'emailChanged' => $email !== null,
            'passwordChanged' => $newPassword !== null,
        ]);

        JsonResponse::ok(['login' => $updated['login'], 'email' => $updated['email'], 'role' => $updated['role']]);
    }

    private function idFromQuery(Request $request): int
    {
        $raw = $request->query['id'] ?? null;

        if (!is_string($raw) || !ctype_digit($raw)) {
            throw new ApiException('Brak lub nieprawidłowy parametr "id".', 400);
        }

        return (int) $raw;
    }
}
