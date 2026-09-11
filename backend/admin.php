<?php

declare(strict_types=1);

define('APP_ENTRY', true);

use App\Controller\AdminController;
use App\Controller\AuthController;
use App\Controller\BuildController;
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
use App\Repository\MysqlRoleRepository;
use App\Repository\MysqlUserRepository;

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
// build po naprawieniu backendu, bez logowania się do GitHuba.
$adminController = static fn (): AdminController =>
    new AdminController(new MysqlPageRepository(Connection::get($config)));

$authController = static fn (): AuthController => new AuthController(
    new MysqlUserRepository(Connection::get($config)),
    new SessionToken($config->get('SESSION_SECRET'))
);

$roleRepository = static fn (): MysqlRoleRepository => new MysqlRoleRepository(Connection::get($config));

$usersController = static fn (): UsersController =>
    new UsersController(new MysqlUserRepository(Connection::get($config)), $roleRepository());

$rolesController = static fn (): RolesController => new RolesController($roleRepository());

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
$router->get('/pages', static fn (Request $req) => $adminController()->listPages($currentSession));
$router->post('/pages', static fn (Request $req) => $adminController()->createPage($req, $currentSession));
$router->get('/page', static fn (Request $req) => $adminController()->getPage($req, $currentSession));
$router->post('/page', static fn (Request $req) => $adminController()->savePage($req, $currentSession));
$router->delete('/page', static fn (Request $req) => $adminController()->deletePage($req, $currentSession));
// Pola typu "asset" w panelu (zdjęcia/ikony) — każdy zalogowany redaktor, bez
// wymogu roli "admin" (to edycja treści, jak savePage, nie operacja na koncie/deployu).
$router->post('/upload', static fn (Request $req) => $uploadController->upload($req));
// "Zbuduj stronę" wymaga roli "admin" — edytorzy mogą zmieniać treść,
// ale nie wyzwalać deployu na produkcję.
$router->post('/build', static function (Request $req) use ($buildController, $currentSession) {
    SessionAuth::requireRole($currentSession, 'admin');
    $buildController->trigger();
});
$router->get('/build/status', static function (Request $req) use ($buildController, $currentSession) {
    SessionAuth::requireRole($currentSession, 'admin');
    $buildController->status($req);
});

// Zarządzanie kontami ("Ustawienia" w panelu) — tylko rola "admin", z tych
// samych powodów co "Zbuduj stronę": to operacja wpływająca na dostęp do
// całego panelu, nie na treść jednej strony.
$router->get('/users', static function (Request $req) use ($usersController, $currentSession) {
    SessionAuth::requireRole($currentSession, 'admin');
    $usersController()->listUsers();
});
$router->post('/users', static function (Request $req) use ($usersController, $currentSession) {
    SessionAuth::requireRole($currentSession, 'admin');
    $usersController()->createUser($req);
});
$router->delete('/users', static function (Request $req) use ($usersController, $currentSession) {
    SessionAuth::requireRole($currentSession, 'admin');
    $usersController()->deleteUser($req, $currentSession);
});

// Zarządzanie rolami ("Ustawienia" w panelu, obok kont) — tylko rola "admin",
// z tych samych powodów co "/users": role decydują o dostępie do całego panelu
// (users.role) i do treści (acl.role), nie o pojedynczej stronie.
$router->get('/roles', static function (Request $req) use ($rolesController, $currentSession) {
    SessionAuth::requireRole($currentSession, 'admin');
    $rolesController()->listRoles();
});
$router->post('/roles', static function (Request $req) use ($rolesController, $currentSession) {
    SessionAuth::requireRole($currentSession, 'admin');
    $rolesController()->createRole($req);
});
$router->delete('/roles', static function (Request $req) use ($rolesController, $currentSession) {
    SessionAuth::requireRole($currentSession, 'admin');
    $rolesController()->deleteRole($req);
});

$router->dispatch($request);
