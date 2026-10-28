<?php

declare(strict_types=1);

define('APP_ENTRY', true);

use App\Controller\ActivityController;
use App\Controller\ApiTokenController;
use App\Controller\AssetController;
use App\Controller\AdminController;
use App\Controller\AuthController;
use App\Controller\BuildController;
use App\Controller\PageLockController;
use App\Controller\PermissionsController;
use App\Controller\PriceReportController;
use App\Controller\RolesController;
use App\Controller\SiteFileController;
use App\Controller\UploadController;
use App\Controller\UsersController;
use App\Database\Connection;
use App\Http\Cors;
use App\Http\GithubDispatcher;
use App\Http\Request;
use App\Http\Router;
use App\Http\SessionAuth;
use App\Http\SessionToken;
use App\PriceReport\PriceReportGenerator;
use App\Repository\MysqlActivityLogRepository;
use App\Repository\MysqlApiTokenRepository;
use App\Repository\MysqlAssetRepository;
use App\Repository\MysqlPageLockRepository;
use App\Repository\MysqlPageRepository;
use App\Repository\MysqlPermissionRepository;
use App\Repository\MysqlRoleRepository;
use App\Repository\MysqlSiteFileRepository;
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

$activityLogRepository = static fn (): MysqlActivityLogRepository => new MysqlActivityLogRepository(Connection::get($config));

// Połączenie z bazą jest leniwe — otwiera się dopiero, gdy faktycznie
// obsługujemy trasę, która go potrzebuje.
$adminController = static fn (): AdminController => new AdminController(
    new MysqlPageRepository(Connection::get($config)),
    $activityLogRepository(),
    new MysqlPageLockRepository(Connection::get($config))
);
$pageLockController = static fn (): PageLockController =>
    new PageLockController(new MysqlPageLockRepository(Connection::get($config)), $activityLogRepository());

$roleRepository = static fn (): MysqlRoleRepository => new MysqlRoleRepository(Connection::get($config));
$permissionRepository = static fn (): MysqlPermissionRepository => new MysqlPermissionRepository(Connection::get($config));
$userRepository = static fn (): MysqlUserRepository => new MysqlUserRepository(Connection::get($config));

$authController = static fn (): AuthController => new AuthController(
    $userRepository(),
    new SessionToken($config->get('SESSION_SECRET')),
    $permissionRepository(),
    $activityLogRepository()
);

// JEDYNA bramka operacyjnych uprawnień — patrz
// backend/src/Support/Authorization.php. Pobiera świeżą rolę z bazy po
// userId z tokenu przy KAŻDYM wywołaniu, więc zmiana roli/"deny" działa od
// następnego żądania, nie dopiero od następnego logowania.
$authorization = static fn (): Authorization => new Authorization($userRepository(), $permissionRepository());

$usersController = static fn (): UsersController =>
    new UsersController($userRepository(), $roleRepository(), $permissionRepository(), $activityLogRepository());

$rolesController = static fn (): RolesController => new RolesController($roleRepository(), $activityLogRepository());

$permissionsController = static fn (): PermissionsController =>
    new PermissionsController($userRepository(), $roleRepository(), $permissionRepository(), $activityLogRepository());

$buildController = new BuildController(
    new GithubDispatcher(
        $config->get('GITHUB_TOKEN'),
        $config->get('GITHUB_OWNER'),
        $config->get('GITHUB_REPO'),
        $config->get('GITHUB_WORKFLOW', 'deploy.yml'),
        $config->get('GITHUB_REF', 'main')
    ),
    $activityLogRepository()
);

$uploadController = new UploadController($activityLogRepository(), new MysqlAssetRepository(Connection::get($config)));

$activityController = static fn (): ActivityController => new ActivityController($activityLogRepository());

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
    $adminController()->createPage($req, $role, $currentSession);
});
$router->get('/page', static function (Request $req) use ($adminController, $authorization, $currentSession) {
    $role = $authorization()->require($currentSession, 'pages.read');
    $adminController()->getPage($req, $role);
});
$router->post('/page', static function (Request $req) use ($adminController, $authorization, $currentSession) {
    $role = $authorization()->require($currentSession, 'pages.update');
    $adminController()->savePage($req, $role, $currentSession);
});
$router->delete('/page', static function (Request $req) use ($adminController, $authorization, $currentSession) {
    $role = $authorization()->require($currentSession, 'pages.delete');
    $adminController()->deletePage($req, $role, $currentSession);
});

$router->post('/upload', static function (Request $req) use ($uploadController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'assets.upload');
    $uploadController->upload($req, $currentSession);
});

// /build, /build/status — uprawnienie "build.trigger"/"build.status" jest
// elastyczne jak każde inne, ale z bezbazowym fallbackiem do roli "admin" z
// tokenu, gdy baza akurat nie odpowiada — patrz Authorization::requireResilient().
$router->post('/build', static function (Request $req) use ($buildController, $authorization, $currentSession) {
    $authorization()->requireResilient($currentSession, 'build.trigger');
    $buildController->trigger($req, $currentSession);
});
$router->get('/build/status', static function (Request $req) use ($buildController, $authorization, $currentSession) {
    $authorization()->requireResilient($currentSession, 'build.status');
    $buildController->status($req);
});

// Zarządzanie kontami ("Ustawienia" w panelu).
$router->get('/users', static function (Request $req) use ($usersController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'users.list');
    $usersController()->listUsers();
});
$router->post('/users', static function (Request $req) use ($usersController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'users.create');
    $usersController()->createUser($req, $currentSession);
});
$router->delete('/users', static function (Request $req) use ($usersController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'users.delete');
    $usersController()->deleteUser($req, $currentSession);
});

// "Moje konto" ("Ustawienia" w panelu) — celowo BEZ Authorization::require():
// zmienia zawsze i wyłącznie WŁASNE konto wołającego (patrz
// UsersController::updateOwnAccount()), więc żadne uprawnienie z
// PermissionRegistry nie ma tu czego ograniczać — dostępne dla KAŻDEGO
// zalogowanego, niezależnie od roli/uprawnień.
$router->post('/account', static fn (Request $req) => $usersController()->updateOwnAccount($req, $currentSession));

// Zarządzanie rolami ("Ustawienia" w panelu, obok kont).
$router->get('/roles', static function (Request $req) use ($rolesController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'roles.list');
    $rolesController()->listRoles();
});
$router->post('/roles', static function (Request $req) use ($rolesController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'roles.create');
    $rolesController()->createRole($req, $currentSession);
});
$router->delete('/roles', static function (Request $req) use ($rolesController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'roles.delete');
    $rolesController()->deleteRole($req, $currentSession);
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
    $permissionsController()->updateRolePermissions($req, $currentSession);
});
$router->get('/users/permissions', static function (Request $req) use ($permissionsController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'roles.permissions.manage');
    $permissionsController()->listUserPermissions($req);
});
$router->post('/users/permissions/deny', static function (Request $req) use ($permissionsController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'roles.permissions.manage');
    $permissionsController()->denyUserPermission($req, $currentSession);
});
$router->delete('/users/permissions/deny', static function (Request $req) use ($permissionsController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'roles.permissions.manage');
    $permissionsController()->undenyUserPermission($req, $currentSession);
});

// GET /me — świeże dane WŁASNEGO konta wołającego (login/rola/efektywne
// uprawnienia), bez wymogu żadnego konkretnego uprawnienia — każdy
// zalogowany odczytuje tylko siebie. Woła panel po zalogowaniu i po każdej
// zmianie w sekcji Uprawnienia, żeby zobaczyć efekt bez przelogowania.
$router->get('/me', static fn (Request $req) => $permissionsController()->me($req, $currentSession));

// Historia aktywności ("Aktywność" w Ustawieniach) — patrz ActivityController.php
// i db/013_create_activity_log.sql. "activity.list" nie jest nadane
// "editor"/"blog" w seedzie (db/011) — domyślnie widzi to tylko rola
// "admin" (przez wildcard '*'), tym samym mechanizmem RBAC co reszta panelu.
$router->get('/activity', static function (Request $req) use ($activityController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'activity.list');
    $activityController()->list($req);
});

// Blokada edycji stron — jedna osoba naraz (PageLockController.php, db/029).
$router->post('/page-lock/acquire', static function (Request $req) use ($pageLockController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'pages.update');
    $pageLockController()->acquire($req, $currentSession);
});
$router->post('/page-lock/heartbeat', static function (Request $req) use ($pageLockController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'pages.update');
    $pageLockController()->heartbeat($req, $currentSession);
});
$router->post('/page-lock/release', static function (Request $req) use ($pageLockController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'pages.update');
    $pageLockController()->release($req);
});
$router->get('/page-locks', static function (Request $req) use ($pageLockController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'pages.list');
    $pageLockController()->list($currentSession);
});

// Assets — biblioteka wgranych plików (AssetController.php, db/034): katalogi, przenoszenie, usuwanie.
$assetController = static fn (): AssetController => new AssetController(new MysqlAssetRepository(Connection::get($config)), $activityLogRepository());
$router->get('/assets', static function (Request $req) use ($assetController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'assets.list');
    $assetController()->list($req);
});
$router->get('/assets/usage', static function (Request $req) use ($assetController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'assets.list');
    $assetController()->usage($req);
});
$router->post('/assets/update', static function (Request $req) use ($assetController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'assets.manage');
    $assetController()->update($req, $currentSession);
});
$router->post('/assets/folders', static function (Request $req) use ($assetController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'assets.manage');
    $assetController()->createFolder($req, $currentSession);
});
$router->post('/assets/folders/update', static function (Request $req) use ($assetController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'assets.manage');
    $assetController()->updateFolder($req, $currentSession);
});
$router->delete('/assets/folders', static function (Request $req) use ($assetController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'assets.manage');
    $assetController()->deleteFolder($req, $currentSession);
});
$router->delete('/assets', static function (Request $req) use ($assetController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'assets.delete');
    $assetController()->delete($req, $currentSession);
});

// Tokeny REST API v1 (ApiTokenController.php, db/037) — Ustawienia → Tokeny API.
$apiTokenController = static fn (): ApiTokenController => new ApiTokenController(new MysqlApiTokenRepository(Connection::get($config)), $activityLogRepository());
$router->get('/api-tokens', static function (Request $req) use ($apiTokenController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'api.tokens.manage');
    $apiTokenController()->list();
});
$router->post('/api-tokens', static function (Request $req) use ($apiTokenController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'api.tokens.manage');
    $apiTokenController()->create($req, $currentSession);
});
$router->post('/api-tokens/revoke', static function (Request $req) use ($apiTokenController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'api.tokens.manage');
    $apiTokenController()->revoke($req, $currentSession);
});

// Pliki serwisu (robots.txt, …; SiteFileController.php, db/038) — Ustawienia → Pliki serwisu.
$siteFileController = static fn (): SiteFileController => new SiteFileController(new MysqlSiteFileRepository(Connection::get($config)), $activityLogRepository());
$router->get('/site-files', static function (Request $req) use ($siteFileController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'site.files.manage');
    $siteFileController()->list();
});
$router->post('/site-files', static function (Request $req) use ($siteFileController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'site.files.manage');
    $siteFileController()->save($req, $currentSession);
});

// Identyfikatory i typy stron w REST API v1 (PageIdentity) — uzupełnianie brakujących (Ustawienia → Tokeny API).
$router->get('/page-identity', static function (Request $req) use ($adminController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'api.tokens.manage');
    $adminController()->pageIdentityPreview();
});
$router->post('/page-identity', static function (Request $req) use ($adminController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'api.tokens.manage');
    $adminController()->assignPageIdentity($currentSession);
});

// Raportowanie cen (dane.gov.pl) — katalogi raportów inwestycji, podgląd plików,
// ręczne generowanie. Codziennie generuje je cron (cron.php) — patrz PriceReportGenerator.php.
$priceReportController = static fn (): PriceReportController => new PriceReportController(
    new PriceReportGenerator(new MysqlPageRepository(Connection::get($config)), $config->get('SITE_URL', 'https://kgd-group.pl')),
    $activityLogRepository()
);
$router->get('/price-reports', static function (Request $req) use ($priceReportController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'reports.list');
    $priceReportController()->list();
});
$router->get('/price-reports/files', static function (Request $req) use ($priceReportController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'reports.list');
    $priceReportController()->listFiles($req);
});
$router->get('/price-reports/file', static function (Request $req) use ($priceReportController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'reports.list');
    $priceReportController()->file($req);
});
$router->post('/price-reports/toggle', static function (Request $req) use ($priceReportController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'reports.generate');
    $priceReportController()->toggle($req, $currentSession);
});
$router->post('/price-reports/generate', static function (Request $req) use ($priceReportController, $authorization, $currentSession) {
    $authorization()->require($currentSession, 'reports.generate');
    $priceReportController()->generate($req, $currentSession);
});

$router->dispatch($request);
