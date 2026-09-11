<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\ApiException;
use App\Exception\NotFoundException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\ActivityLogRepositoryInterface;
use App\Repository\RoleRepositoryInterface;
use JsonException;
use PDOException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Zarządzanie rolami (sekcja "Ustawienia" w /admin, obok kont — patrz
 * UsersController.php) — role dostępne do przypisania kontom (users.role,
 * patrz UsersController::createUser()) i do ACL stron/pól (acl.role, patrz
 * Acl.php). Wszystkie trasy wymagają uprawnienia "roles.list"/"roles.create"/
 * "roles.delete" (patrz admin.php: Authorization::require() przed
 * wywołaniem którejkolwiek metody tego kontrolera, patrz Authorization.php).
 */
final class RolesController
{
    /** Nazwa techniczna: małe litery/cyfry/-/_ , zaczyna się od litery, 2-50 znaków. */
    private const NAME_PATTERN = '/^[a-z][a-z0-9_-]{1,49}$/';

    public function __construct(
        private readonly RoleRepositoryInterface $roles,
        private readonly ActivityLogRepositoryInterface $activity
    ) {
    }

    /** GET /roles — lista ról pod panel ustawień i pod selektor roli w formularzu nowego konta. */
    public function listRoles(): void
    {
        JsonResponse::ok($this->roles->listAll());
    }

    /**
     * POST /roles, body: {"name": "marketing", "label": "Marketing — treść kampanii"}
     *
     * "name" to techniczna nazwa — PRIMARY KEY w tabeli `roles`, na niej
     * (nie na "label") opiera się każde porównanie w Acl::check() i
     * users.role. Celowo NIGDY się nie zmienia po utworzeniu — nie ma
     * endpointu do jej edycji, tylko do utworzenia i usunięcia roli; "label"
     * to wyłącznie czytelny podpis w panelu.
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     */
    public function createRole(Request $request, ?array $currentSession): void
    {
        try {
            $body = $request->jsonBody();
        } catch (JsonException) {
            throw new ApiException('Niepoprawny JSON.', 400);
        }

        $name = is_string($body['name'] ?? null) ? strtolower(trim($body['name'])) : '';
        $label = is_string($body['label'] ?? null) ? trim($body['label']) : '';

        if (!preg_match(self::NAME_PATTERN, $name)) {
            throw new ApiException(
                'Nazwa techniczna roli: 2-50 znaków, małe litery/cyfry/"-"/"_", musi zaczynać się od litery.',
                400
            );
        }

        if ($label === '') {
            throw new ApiException('Podaj etykietę roli.', 400);
        }

        try {
            $role = $this->roles->create($name, $label);
        } catch (PDOException $exception) {
            if ($exception->getCode() === '23000') {
                throw new ApiException('Rola o tej nazwie technicznej już istnieje.', 409);
            }

            throw $exception;
        }

        $this->activity->log($currentSession['userId'] ?? null, $currentSession['login'] ?? null, 'roles.create', $name, ['label' => $label]);

        JsonResponse::ok($role);
    }

    /**
     * DELETE /roles?name=marketing
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     */
    public function deleteRole(Request $request, ?array $currentSession): void
    {
        $name = is_string($request->query['name'] ?? null) ? $request->query['name'] : '';

        if ($name === '') {
            throw new ApiException('Brak wymaganego parametru "name".', 400);
        }

        if (!$this->roles->exists($name)) {
            throw new NotFoundException("Nie znaleziono roli: {$name}.");
        }

        // "admin" jest zaszyty w SessionAuth::requireRole() i Acl::check() (zawsze
        // przechodzi każdy check, niezależnie od tabeli `roles`) — usunięcie jej
        // definicji, nawet gdyby żadne konto jej nie używało, byłoby mylące: rola
        // dalej "istnieje" w zachowaniu kodu, tylko znika z listy w panelu.
        if ($name === 'admin') {
            throw new ApiException('Nie można usunąć roli "admin".', 400);
        }

        $usersWithRole = $this->roles->countUsersWithRole($name);
        if ($usersWithRole > 0) {
            $accounts = $usersWithRole === 1 ? 'konta' : 'kont';
            throw new ApiException("Nie można usunąć roli \"{$name}\" — jest przypisana do {$usersWithRole} {$accounts}.", 400);
        }

        $this->roles->delete($name);

        $this->activity->log($currentSession['userId'] ?? null, $currentSession['login'] ?? null, 'roles.delete', $name);

        JsonResponse::ok(['deleted' => true, 'name' => $name]);
    }
}
