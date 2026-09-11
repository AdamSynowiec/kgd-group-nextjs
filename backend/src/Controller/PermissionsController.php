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
use App\Support\PermissionRegistry;
use JsonException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Panel "Uprawnienia" (sekcja "Ustawienia", obok kont i ról) — mapowanie
 * rola->uprawnienia (`role_permissions`) i indywidualne odebrania
 * uprawnień userom (`user_permission_denies`), patrz
 * db/011_create_permission_tables.sql i Authorization.php. Wszystkie trasy
 * poza /me wymagają uprawnienia "roles.permissions.manage" (patrz admin.php).
 *
 * Bez indywidualnych "allow" — jedyna operacja na pojedynczym userze to
 * odebranie (deny) albo przywrócenie (usunięcie deny) uprawnienia, którego
 * już i tak udziela jego rola.
 */
final class PermissionsController
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly RoleRepositoryInterface $roles,
        private readonly PermissionRepositoryInterface $permissions,
        private readonly ActivityLogRepositoryInterface $activity
    ) {
    }

    /** GET /roles/permissions — mapowanie WSZYSTKICH ról naraz, pod grid w panelu. */
    public function listRolePermissions(): void
    {
        JsonResponse::ok(['roles' => $this->roles->listAll(), 'grants' => $this->permissions->roleGrants()]);
    }

    /**
     * POST /roles/permissions, body: {"role": "editor", "permissions": ["pages.list", ...]} — nadpisuje CAŁY zestaw roli na raz.
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     */
    public function updateRolePermissions(Request $request, ?array $currentSession): void
    {
        try {
            $body = $request->jsonBody();
        } catch (JsonException) {
            throw new ApiException('Niepoprawny JSON.', 400);
        }

        $roleName = is_string($body['role'] ?? null) ? $body['role'] : '';
        $permissions = is_array($body['permissions'] ?? null) ? $body['permissions'] : null;

        if ($roleName === '') {
            throw new ApiException('Brak wymaganego pola "role".', 400);
        }

        if ($permissions === null) {
            throw new ApiException('Brak wymaganego pola "permissions".', 400);
        }

        if (!$this->roles->exists($roleName)) {
            throw new NotFoundException("Nie znaleziono roli: {$roleName}.");
        }

        // Rola "admin" ma na stałe tylko '*' — patrz PermissionRegistry.php i
        // db/011_create_permission_tables.sql. Bez tego dałoby się przez ten
        // endpoint osłabić jedyną rolę, która ma zawsze pełny dostęp.
        if ($roleName === 'admin') {
            throw new ApiException('Uprawnień roli "admin" nie można edytować — ma zawsze pełny dostęp.', 400);
        }

        foreach ($permissions as $permission) {
            if (!is_string($permission) || !PermissionRegistry::isValid($permission)) {
                throw new ApiException('Nieznane uprawnienie w liście.', 400);
            }

            // build.trigger/build.status ZAWSZE wymagają roli "admin" —
            // wymuszane na stałe przez SessionAuth::requireRole('admin'), nie
            // przez ten mechanizm (patrz PermissionRegistry::FIXED_ADMIN_ONLY
            // i komentarz w admin.php). Zapisanie ich tu dałoby mylący stan:
            // checkbox zaznaczony, zero realnego efektu.
            if (in_array($permission, PermissionRegistry::FIXED_ADMIN_ONLY, true)) {
                throw new ApiException(
                    "Uprawnienia \"{$permission}\" nie można przypisać żadnej roli — zawsze wymaga roli \"admin\" (działa nawet, gdy baza nie odpowiada).",
                    400
                );
            }
        }

        $this->permissions->setRoleGrants($roleName, $permissions);

        $this->activity->log(
            $currentSession['userId'] ?? null,
            $currentSession['login'] ?? null,
            'roles.permissions.manage',
            $roleName,
            ['permissions' => array_values(array_unique($permissions))]
        );

        JsonResponse::ok(['role' => $roleName, 'permissions' => array_values(array_unique($permissions))]);
    }

    /** GET /users/permissions?id=5 — efektywne uprawnienia jednego konta, z rozbiciem na źródło (rola / odebrane). */
    public function listUserPermissions(Request $request): void
    {
        $userId = $this->userIdFromQuery($request);
        $user = $this->users->findById($userId);

        if ($user === null) {
            throw new NotFoundException("Nie znaleziono konta o id {$userId}.");
        }

        $allGrants = $this->permissions->roleGrants();

        JsonResponse::ok([
            'userId' => $userId,
            'role' => $user['role'],
            'granted' => $allGrants[$user['role']] ?? [],
            'denied' => $this->permissions->userDenies($userId),
            'effective' => $this->permissions->effectivePermissions($userId, $user['role']),
        ]);
    }

    /**
     * POST /users/permissions/deny?id=5, body: {"permission": "pages.delete"} — odbiera jedno uprawnienie mimo roli.
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     */
    public function denyUserPermission(Request $request, ?array $currentSession): void
    {
        $userId = $this->userIdFromQuery($request);
        $target = $this->users->findById($userId);

        if ($target === null) {
            throw new NotFoundException("Nie znaleziono konta o id {$userId}.");
        }

        try {
            $body = $request->jsonBody();
        } catch (JsonException) {
            throw new ApiException('Niepoprawny JSON.', 400);
        }

        $permission = is_string($body['permission'] ?? null) ? $body['permission'] : '';
        if (!PermissionRegistry::isValid($permission)) {
            throw new ApiException('Nieznane uprawnienie.', 400);
        }

        // Ostatni aktywny admin — patrz PermissionRegistry::CRITICAL i
        // PermissionRepositoryInterface::countActiveAdmins(). Sprawdzane PRZED
        // dodaniem deny: jeśli to jedyny jeszcze "aktywny" admin, odmowa.
        if (
            $target['role'] === 'admin'
            && in_array($permission, PermissionRegistry::CRITICAL, true)
            && $this->permissions->countActiveAdmins() <= 1
        ) {
            throw new ApiException(
                'Nie można odebrać ostatniemu aktywnemu adminowi możliwości zarządzania adminami i uprawnieniami.',
                400
            );
        }

        $this->permissions->addDeny($userId, $permission);

        $this->activity->log(
            $currentSession['userId'] ?? null,
            $currentSession['login'] ?? null,
            'permissions.deny',
            $target['login'],
            ['permission' => $permission]
        );

        JsonResponse::ok(['denied' => true, 'userId' => $userId, 'permission' => $permission]);
    }

    /**
     * DELETE /users/permissions/deny?id=5&permission=pages.delete — przywraca dostęp wynikający z roli.
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     */
    public function undenyUserPermission(Request $request, ?array $currentSession): void
    {
        $userId = $this->userIdFromQuery($request);
        $target = $this->users->findById($userId);

        if ($target === null) {
            throw new NotFoundException("Nie znaleziono konta o id {$userId}.");
        }

        $permission = is_string($request->query['permission'] ?? null) ? $request->query['permission'] : '';

        if ($permission === '') {
            throw new ApiException('Brak wymaganego parametru "permission".', 400);
        }

        $this->permissions->removeDeny($userId, $permission);

        $this->activity->log(
            $currentSession['userId'] ?? null,
            $currentSession['login'] ?? null,
            'permissions.undeny',
            $target['login'],
            ['permission' => $permission]
        );

        JsonResponse::ok(['restored' => true, 'userId' => $userId, 'permission' => $permission]);
    }

    /**
     * GET /me — świeże dane wołającego (login/rola/efektywne uprawnienia) po
     * userId z tokenu, NIE z (potencjalnie nieaktualnej, patrz Authorization.php)
     * roli zaszytej w tokenie. Jedyna trasa w tym kontrolerze bez wymogu
     * "roles.permissions.manage" — każdy zalogowany odczytuje TYLKO własne dane.
     * Panel woła to po zalogowaniu i po każdej zmianie uprawnień, żeby
     * zobaczyć efekt bez wylogowania.
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     */
    public function me(Request $request, ?array $currentSession): void
    {
        if ($currentSession === null) {
            // Uwierzytelnianie panelu wyłączone (ADMIN_AUTH_ENABLED=false) — brak
            // tożsamości, więc nic nie jest blokowane (patrz Authorization::require()).
            JsonResponse::ok(['login' => null, 'role' => null, 'permissions' => ['*']]);
            return;
        }

        $user = $this->users->findById($currentSession['userId']);
        if ($user === null) {
            throw new ApiException('Sesja nieważna — zaloguj się ponownie.', 401);
        }

        JsonResponse::ok([
            'login' => $user['login'],
            'role' => $user['role'],
            'permissions' => $this->permissions->effectivePermissions($user['id'], $user['role']),
        ]);
    }

    private function userIdFromQuery(Request $request): int
    {
        $raw = $request->query['id'] ?? null;

        if (!is_string($raw) || !ctype_digit($raw)) {
            throw new ApiException('Brak lub nieprawidłowy parametr "id".', 400);
        }

        return (int) $raw;
    }
}
