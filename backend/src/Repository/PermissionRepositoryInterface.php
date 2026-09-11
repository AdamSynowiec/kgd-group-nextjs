<?php

declare(strict_types=1);

namespace App\Repository;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/** Patrz db/011_create_permission_tables.sql i backend/src/Support/Authorization.php. */
interface PermissionRepositoryInterface
{
    /** Efektywne: deny (user) nadpisuje nadanie (role), '*' na roli oznacza wszystko. */
    public function effectiveHas(int $userId, string $role, string $permission): bool;

    /** @return list<string> — ['*'] dla roli z wildcardem, inaczej lista uprawnień PO ODJĘCIU indywidualnych deny tego usera. */
    public function effectivePermissions(int $userId, string $role): array;

    /** @return array<string, list<string>> — nazwa roli -> lista jej uprawnień (wildcard '*' jako pojedynczy element dla "admin"). Pod grid w panelu. */
    public function roleGrants(): array;

    /**
     * Nadpisuje CAŁY zestaw uprawnień danej roli (nie pojedyncze dodanie/usunięcie —
     * checkbox-grid w panelu wysyła zawsze pełny stan na raz). Czysta warstwa
     * zapisu — to WOŁAJĄCY (PermissionsController) odpowiada za odrzucenie
     * $roleName === 'admin' PRZED wywołaniem, mirror tego, jak
     * RolesController::deleteRole() (nie MysqlRoleRepository) pilnuje ochrony
     * nazwy "admin".
     * @param list<string> $permissions
     */
    public function setRoleGrants(string $roleName, array $permissions): void;

    /** @return list<string> — permission stringi odebrane temu userowi indywidualnie. */
    public function userDenies(int $userId): array;

    public function addDeny(int $userId, string $permission): void;

    public function removeDeny(int $userId, string $permission): void;

    /**
     * Liczba kont z rolą "admin", które NIE mają indywidualnego deny na żadne
     * z PermissionRegistry::CRITICAL — czyli realnie mogą jeszcze zarządzać
     * adminami/uprawnieniami. Generalizacja UserRepositoryInterface::countAdmins()
     * o świadomość deny.
     */
    public function countActiveAdmins(): int;
}
