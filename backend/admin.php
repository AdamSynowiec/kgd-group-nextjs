<?php

declare(strict_types=1);

define('APP_ENTRY', true);

use App\Controller\AdminController;
use App\Controller\AuthController;
use App\Controller\BuildController;
use App\Controller\PermissionsController;
use App\Controller\RolesController;
use App\Controller\UploadController;
use App\Controller\UsersController;
use App\Database\Connection;
use App\Http\Cors;
use App\Http\GithubDispatcher;
use App\Http\Request;
use App\Http\Router;
use App\Http\SessionAuth;
use App\Http\SessionToken;
use App\Repository\MysqlPageRepository;
use App\Repository\MysqlPermissionRepository;
use App\Repository\MysqlRoleRepository;
use App\Repository\MysqlUserRepository;
use App\Support\Authorization;

/**
 * API panelu (JSON) — osobny front controller od index.php (publiczne,
 * tylko-do-odczytu API). UI panelu żyje w Next.js pod /admin (src/app/admin/).
 *
 * Trasa przychodzi przez ?route=, z tego samego powodu co w index.php
 * (patrz Http/Request.php) — routing niezależny od konfiguracji serwera.
 */

$config = require __DIR__ . '/src/bootstrap.php';

Cors::handle($config);

$request = Request::fromGlobals();

// /login jest jedyną trasą publiczną — to na niej dopiero powstaje sesja.
// Wszystko inne wymaga ważnego tokenu (gdy ADMIN_AUTH_ENABLED=true).
$currentSession = $request->path === '/login' ? null : SessionAuth::guard($config);

// Połączenie z bazą jest leniwe — otwiera się dopiero, gdy faktycznie
// obsługujemy trasę, która go potrzebuje. Weryfikacja tokenu (SessionAuth::guard()
// powyżej) NIE dotyka bazy, więc "Zbuduj stronę" działa nawet, gdy baza akurat
// nie odpowiada — to jedno z realnych zastosowań tego przycisku: odpalić
// build po naprawieniu backendu, bez logowania się do GitHuba. Dlatego
// /build i /build/status jako JEDYNE zostają na starym, bezbazowym
// SessionAuth::requireRole() zamiast $authorization niżej — patrz jego
// komentarz i backend/src/Support/PermissionRegistry.php.
$adminController = static fn (): AdminController =>
    new AdminController(new MysqlPageRepository(Connection::get($config)));

$roleRepository = static fn (): MysqlRoleRepository => new MysqlRoleRepository(Connection::get($config));
$permissionRepository = static fn (): MysqlPermissionRepository => new MysqlPermissionRepository(Connection::get($config));
$userRepository = static fn (): MysqlUserRepository => new MysqlUserRepository(Connection::get($config));

$authController = static fn (): AuthController => new AuthController(
    $userRepository(),
    new SessionToken($config->get('SESSION_SECRET')),
    $permissionRepository()
);

// JEDYNA bramka operacyjnych uprawnień (poza /build, patrz wyżej) — patrz
// backend/src/Support/Authorization.php. Pobiera świeżą rolę z bazy po
// userId z tokenu przy KAŻDYM wywołaniu, więc zmiana roli/"deny" działa od
// następnego żądania, nie dopiero od następnego logowania.
$authorization = static fn (): Authorization => new Authorization($userRepository(), $permissionRepository());

$usersController = static fn (): UsersController =>
    new UsersController($userRepository(), $roleRepository(), $permissionRepository());

$rolesController = static fn (): RolesController => new RolesController($roleRepository());

$permissionsController = static fn (): PermissionsController =>
    new PermissionsController($userRepository(), $roleRepository(), $permissionRepository());

$buildController = new BuildController(new GithubDispatcher(
    $config->get('GITHUB_TOKEN'),
    $config->get('GITHUB_OWNER'),
    $config->get('GITHUB_REPO'),
    $config->get('GITHUB_WORKFLOW', 'deploy.yml'),
    $config->get('GITHUB_REF', 'main')
));

$uploadController = new UploadController();

$router = new Router();
$router->post('/login', static fn (Request $req) => $authController()->login($req));

// Strony — ACL treści (Acl::canRead/canWrite, patrz Acl.php) jest DRUGĄ,
// niezależną warstwą pod spodem, sprawdzaną wewnątrz AdminController samo
// dla /page*, przeciwko $role zwróconemu tutaj — patrz komentarz w
// AdminController::listPages().
$router->get('/pages', static function (Request $req) use ($adminController, $authorization, $currentSession) {
    $role = $authorization()->require($currentSession, 'pages.list');
    $adminController()->listPages($role);
});
$router->post('/pages', static function (Request $req) use ($adminController, $authorization, $currentSession) {
    $role = $authorization()->require($currentSession, 'pages.create');
    $adminController()->createPage($req, $role);
});
$router->get('/page', static function (Request $req) use ($adminController, $authorization, $currentSession) {
    $role = $authorization()->require($currentSession, 'pages.read');
    $adminController()->getPage($req, $role);
});
$router->post('/page', static function (Request $req) use ($adminController, $authorization, $currentSession) {
    $role = $authorization()->require($currentSession, 'pages.update');
    $adminController()->savePage($req, $role);
});
$router->delete('/page', static function (Request $req) use ($adminController, $authorization, $currentSession) {
    $role = $authorization()->require($currentSession, 'pages.delete');
    $adminController()->deletePage($req, $role);
});

$router->post('/upload', static function (Request $req) use ($uploadController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'assets.upload');
    $uploadController->upload($req);
});

// /build, /build/status — patrz komentarz przy $adminController wyżej: na
// stałe poza $authorization, wymagają wprost roli "admin" bez dotykania bazy.
$router->post('/build', static function (Request $req) use ($buildController, $currentSession) {
    SessionAuth::requireRole($currentSession, 'admin');
    $buildController->trigger();
});
$router->get('/build/status', static function (Request $req) use ($buildController, $currentSession) {
    SessionAuth::requireRole($currentSession, 'admin');
    $buildController->status($req);
});

// Zarządzanie kontami ("Ustawienia" w panelu).
$router->get('/users', static function (Request $req) use ($usersController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'users.list');
    $usersController()->listUsers();
});
$router->post('/users', static function (Request $req) use ($usersController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'users.create');
    $usersController()->createUser($req);
});
$router->delete('/users', static function (Request $req) use ($usersController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'users.delete');
    $usersController()->deleteUser($req, $currentSession);
});

// Zarządzanie rolami ("Ustawienia" w panelu, obok kont).
$router->get('/roles', static function (Request $req) use ($rolesController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'roles.list');
    $rolesController()->listRoles();
});
$router->post('/roles', static function (Request $req) use ($rolesController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'roles.create');
    $rolesController()->createRole($req);
});
$router->delete('/roles', static function (Request $req) use ($rolesController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'roles.delete');
    $rolesController()->deleteRole($req);
});

// Zarządzanie uprawnieniami ("Ustawienia" w panelu, obok kont i ról) — patrz
// PermissionsController.php i db/011_create_permission_tables.sql. Dłuższe
// prefiksy ("/roles/permissions", "/users/permissions", "/users/permissions/deny")
// wygrywają nad krótszymi ("/roles", "/users") w Router::dispatch() —
// sprawdzony wzorzec, identyczny jak istniejące "/build" + "/build/status".
$router->get('/roles/permissions', static function (Request $req) use ($permissionsController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'roles.permissions.manage');
    $permissionsController()->listRolePermissions();
});
$router->post('/roles/permissions', static function (Request $req) use ($permissionsController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'roles.permissions.manage');
    $permissionsController()->updateRolePermissions($req);
});
$router->get('/users/permissions', static function (Request $req) use ($permissionsController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'roles.permissions.manage');
    $permissionsController()->listUserPermissions($req);
});
$router->post('/users/permissions/deny', static function (Request $req) use ($permissionsController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'roles.permissions.manage');
    $permissionsController()->denyUserPermission($req);
});
$router->delete('/users/permissions/deny', static function (Request $req) use ($permissionsController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'roles.permissions.manage');
    $permissionsController()->undenyUserPermission($req);
});

// GET /me — świeże dane WŁASNEGO konta wołającego (login/rola/efektywne
// uprawnienia), bez wymogu żadnego konkretnego uprawnienia — każdy
// zalogowany odczytuje tylko siebie. Woła panel po zalogowaniu i po każdej
// zmianie w sekcji Uprawnienia, żeby zobaczyć efekt bez przelogowania.
$router->get('/me', static fn (Request $req) => $permissionsController()->me($req, $currentSession));

$router->dispatch($request);
