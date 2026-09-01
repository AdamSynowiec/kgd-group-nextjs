<?php

declare(strict_types=1);

define('APP_ENTRY', true);

use App\Controller\AdminController;
use App\Controller\BuildController;
use App\Database\Connection;
use App\Http\BasicAuth;
use App\Http\Cors;
use App\Http\GithubDispatcher;
use App\Http\Request;
use App\Http\Router;
use App\Repository\MysqlPageRepository;

/**
 * API panelu edycji (JSON) — osobny front controller od index.php (publiczne,
 * tylko-do-odczytu API). UI panelu żyje w Next.js pod /admin (src/app/admin/);
 * ten plik obsługuje wyłącznie zapytania z tamtego widoku. BasicAuth::guard()
 * strzeże WSZYSTKIEGO tutaj, jednym wywołaniem, zanim router w ogóle zobaczy
 * żądanie.
 *
 * Trasa przychodzi przez ?route=, z tego samego powodu co w index.php
 * (patrz Http/Request.php) — routing niezależny od konfiguracji serwera.
 */

$config = require __DIR__ . '/src/bootstrap.php';

Cors::handle($config);
BasicAuth::guard($config);

// Połączenie z bazą jest leniwe — otwiera się dopiero, gdy faktycznie
// obsługujemy trasę, która go potrzebuje. Dzięki temu "Zbuduj stronę" działa
// nawet, gdy baza akurat nie odpowiada — to jedno z realnych zastosowań tego
// przycisku: odpalić build po naprawieniu backendu, bez logowania się do GitHuba.
$adminController = static fn (): AdminController =>
    new AdminController(new MysqlPageRepository(Connection::get($config)));

$buildController = new BuildController(new GithubDispatcher(
    $config->get('GITHUB_TOKEN'),
    $config->get('GITHUB_OWNER'),
    $config->get('GITHUB_REPO'),
    $config->get('GITHUB_WORKFLOW', 'deploy.yml'),
    $config->get('GITHUB_REF', 'main')
));

$router = new Router();
$router->get('/pages', static fn (Request $request) => $adminController()->listPages());
$router->get('/page', static fn (Request $request) => $adminController()->getPage($request));
$router->post('/page', static fn (Request $request) => $adminController()->savePage($request));
$router->post('/build', static fn (Request $request) => $buildController->trigger());

$router->dispatch(Request::fromGlobals());
