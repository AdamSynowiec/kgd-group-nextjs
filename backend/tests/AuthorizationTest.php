<?php

declare(strict_types=1);

/**
 * Test bez frameworka (jak EditableMergeTest.php — projekt nie ma
 * composer.json/PHPUnit), uruchamiany ręcznie:
 *   php backend/tests/AuthorizationTest.php
 *
 * Testuje Authorization::require() i regułę "deny > nadanie z roli >
 * domyślna odmowa" na FAŁSZYWYCH, trzymanych w pamięci implementacjach
 * UserRepositoryInterface/PermissionRepositoryInterface (bez bazy — ten sam
 * powód co w EditableMergeTest.php: to środowisko nie ma runtime PHP+MySQL
 * do prawdziwego wywołania). MysqlPermissionRepository/MysqlUserRepository
 * same w sobie to cienkie mapowanie SQL <-> tablica — logika, którą warto
 * zweryfikować, jest w Authorization::require() i w samej regule
 * efektywnego uprawnienia, którą te fałszywe repozytoria odzwierciedlają
 * jeden do jednego względem MysqlPermissionRepository::effectiveHas().
 */

define('APP_ENTRY', true);

require __DIR__ . '/../src/Exception/ApiException.php';
require __DIR__ . '/../src/Repository/UserRepositoryInterface.php';
require __DIR__ . '/../src/Repository/PermissionRepositoryInterface.php';
require __DIR__ . '/../src/Support/PermissionRegistry.php';
require __DIR__ . '/../src/Support/Authorization.php';

use App\Exception\ApiException;
use App\Repository\PermissionRepositoryInterface;
use App\Repository\UserRepositoryInterface;
use App\Support\Authorization;
use App\Support\PermissionRegistry;

$failures = [];

function check(string $name, mixed $actual, mixed $expected): void
{
    global $failures;
    $ok = $actual === $expected || (is_array($actual) && is_array($expected) && $actual == $expected);
    echo ($ok ? 'PASS' : 'FAIL') . " - {$name}\n";
    if (!$ok) {
        $failures[] = $name;
        echo '  expected: ' . json_encode($expected) . "\n";
        echo '  actual:   ' . json_encode($actual) . "\n";
    }
}

/** @param callable(): mixed $fn */
function checkThrows(string $name, callable $fn, int $expectedStatus): void
{
    global $failures;
    try {
        $fn();
        echo "FAIL - {$name}\n  expected: ApiException({$expectedStatus})\n  actual:   no exception\n";
        $failures[] = $name;
    } catch (ApiException $exception) {
        $ok = $exception->status() === $expectedStatus;
        echo ($ok ? 'PASS' : 'FAIL') . " - {$name}\n";
        if (!$ok) {
            $failures[] = $name;
            echo "  expected status: {$expectedStatus}\n  actual status:   {$exception->status()}\n";
        }
    }
}

/**
 * Sesja z celowo "zatrutą" rolą — dowód, że Authorization::require() NIGDY
 * nie czyta $session['role'] przy decydowaniu o dostępie, tylko zawsze
 * dociąga świeżą rolę z (fałszywego) repozytorium userów po userId.
 *
 * @return array{userId: int, login: string, role: string, exp: int}
 */
function session(int $userId): array
{
    return ['userId' => $userId, 'login' => "user{$userId}", 'role' => 'stale-token-role-never-trusted', 'exp' => time() + 3600];
}

/** In-memory odpowiednik users — patrz MysqlUserRepository.php. */
final class FakeUserRepository implements UserRepositoryInterface
{
    /** @var array<int, array{id: int, login: string, password: string, role: string}> */
    public array $rows = [];

    public function findByLogin(string $login): ?array
    {
        foreach ($this->rows as $row) {
            if ($row['login'] === $login) {
                return $row;
            }
        }
        return null;
    }

    public function findById(int $id): ?array
    {
        return $this->rows[$id] ?? null;
    }

    public function listAll(): array
    {
        return array_values($this->rows);
    }

    public function create(string $login, string $passwordHash, string $role): array
    {
        $id = count($this->rows) + 1;
        $this->rows[$id] = ['id' => $id, 'login' => $login, 'password' => $passwordHash, 'role' => $role];
        return ['id' => $id, 'login' => $login, 'role' => $role];
    }

    public function delete(int $id): void
    {
        unset($this->rows[$id]);
    }
}

/** In-memory odpowiednik role_permissions/user_permission_denies — mirror MysqlPermissionRepository. */
final class FakePermissionRepository implements PermissionRepositoryInterface
{
    /** Wstrzyknięte po konstrukcji (nie w interfejsie) — tylko countActiveAdmins() tego fejka go potrzebuje, żeby wiedzieć, kto ma rolę "admin". */
    public ?FakeUserRepository $users = null;

    /** @var array<string, list<string>> */
    public array $grants = [];
    /** @var array<int, list<string>> */
    public array $denies = [];

    public function effectiveHas(int $userId, string $role, string $permission): bool
    {
        if (in_array($permission, $this->denies[$userId] ?? [], true)) {
            return false;
        }
        $roleGrants = $this->grants[$role] ?? [];
        return in_array($permission, $roleGrants, true) || in_array('*', $roleGrants, true);
    }

    public function effectivePermissions(int $userId, string $role): array
    {
        $granted = $this->grants[$role] ?? [];
        if (in_array('*', $granted, true)) {
            return ['*'];
        }
        return array_values(array_diff($granted, $this->denies[$userId] ?? []));
    }

    public function roleGrants(): array
    {
        return $this->grants;
    }

    public function setRoleGrants(string $roleName, array $permissions): void
    {
        $this->grants[$roleName] = array_values(array_unique($permissions));
    }

    public function userDenies(int $userId): array
    {
        return $this->denies[$userId] ?? [];
    }

    public function addDeny(int $userId, string $permission): void
    {
        $this->denies[$userId][] = $permission;
        $this->denies[$userId] = array_values(array_unique($this->denies[$userId]));
    }

    public function removeDeny(int $userId, string $permission): void
    {
        $this->denies[$userId] = array_values(array_diff($this->denies[$userId] ?? [], [$permission]));
    }

    public function countActiveAdmins(): int
    {
        if ($this->users === null) {
            return 0;
        }

        $count = 0;
        foreach ($this->users->rows as $user) {
            if ($user['role'] !== 'admin') {
                continue;
            }
            if (array_intersect(PermissionRegistry::CRITICAL, $this->userDenies($user['id'])) === []) {
                $count++;
            }
        }
        return $count;
    }
}

// --- PermissionRegistry::isValid ------------------------------------------------

check('isValid accepts every registered permission', array_map(
    fn ($p) => PermissionRegistry::isValid($p),
    PermissionRegistry::ALL
), array_fill(0, count(PermissionRegistry::ALL), true));

check('isValid rejects unknown string', PermissionRegistry::isValid('pages.publish'), false);
check('isValid rejects "*" (wildcard is a role-grant value, never a real permission)', PermissionRegistry::isValid('*'), false);

// --- setup: users + role grants --------------------------------------------------

$users = new FakeUserRepository();
$permissions = new FakePermissionRepository();
$permissions->users = $users;

$adminId = $users->create('admin1', 'hash', 'admin')['id'];
$editorId = $users->create('editor1', 'hash', 'editor')['id'];

$permissions->setRoleGrants('admin', ['*']);
$permissions->setRoleGrants('editor', ['pages.list', 'pages.read', 'pages.create', 'pages.update', 'pages.delete', 'assets.upload']);

$auth = new Authorization($users, $permissions);

// --- admin wykonuje dozwoloną akcję -----------------------------------------------

check('admin (wildcard role grant) is allowed users.create, returns fresh role', $auth->require(session($adminId), 'users.create'), 'admin');

// --- zwykła rola bez uprawnienia -> 403 -------------------------------------------

checkThrows('editor lacks users.create -> 403', fn () => $auth->require(session($editorId), 'users.create'), 403);
check('editor is still allowed its own granted permission (pages.update)', $auth->require(session($editorId), 'pages.update'), 'editor');

// --- brak sesji (auth wyłączony w configu) -> przepuszcza, jak dziś ---------------

check('null session (ADMIN_AUTH_ENABLED=false) bypasses every check', $auth->require(null, 'users.create'), null);

// --- token wskazuje na usunięte konto -> 401 --------------------------------------

checkThrows('valid token but deleted user id -> 401', fn () => $auth->require(session(9999), 'pages.list'), 401);

// --- indywidualny deny nadpisuje nadanie z roli, NAWET dla admina ----------------

$permissions->addDeny($adminId, 'users.create');
checkThrows("individual deny overrides admin's wildcard role grant -> 403", fn () => $auth->require(session($adminId), 'users.create'), 403);
check('admin still has every OTHER permission despite the one deny', $auth->require(session($adminId), 'roles.delete'), 'admin');

// --- usunięcie deny przywraca dostęp z roli ---------------------------------------

$permissions->removeDeny($adminId, 'users.create');
check('removing the deny restores role-derived access', $auth->require(session($adminId), 'users.create'), 'admin');

// --- ostatni aktywny admin: nie da się "zablokować" jedynego admina --------------

check('exactly one admin, no critical deny -> 1 active admin', $permissions->countActiveAdmins(), 1);

$permissions->addDeny($adminId, 'roles.permissions.manage');
check('sole admin denied a CRITICAL permission -> 0 active admins (would-be lockout)', $permissions->countActiveAdmins(), 0);
$permissions->removeDeny($adminId, 'roles.permissions.manage');

$secondAdminId = $users->create('admin2', 'hash', 'admin')['id'];
$permissions->addDeny($adminId, 'roles.permissions.manage');
check('two admins, one denied a critical permission -> 1 active admin remains (deny allowed)', $permissions->countActiveAdmins(), 1);

echo "\n" . (count($failures) === 0 ? 'ALL PASS' : count($failures) . ' FAILED: ' . implode(', ', $failures)) . "\n";
exit(count($failures) === 0 ? 0 : 1);
