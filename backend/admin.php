<?php

declare(strict_types=1);

define('APP_ENTRY', true);

use App\Controller\AdminController;
use App\Controller\AuthController;
use App\Controller\BuildController;
use App\Database\Connection;
use App\Http\Cors;
use App\Http\GithubDispatcher;
use App\Http\Request;
use App\Http\Router;
use App\Http\SessionAuth;
use App\Http\SessionToken;
use App\Repository\MysqlPageRepository;
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

$buildController = new BuildController(new GithubDispatcher(
    $config->get('GITHUB_TOKEN'),
    $config->get('GITHUB_OWNER'),
    $config->get('GITHUB_REPO'),
    $config->get('GITHUB_WORKFLOW', 'deploy.yml'),
    $config->get('GITHUB_REF', 'main')
));

$router = new Router();
$router->post('/login', static fn (Request $req) => $authController()->login($req));
$router->get('/pages', static fn (Request $req) => $adminController()->listPages());
$router->get('/page', static fn (Request $req) => $adminController()->getPage($req));
$router->post('/page', static fn (Request $req) => $adminController()->savePage($req));
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

$router->dispatch($request);
