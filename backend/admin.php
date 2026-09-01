<?php

declare(strict_types=1);

define('APP_ENTRY', true);

use App\Controller\AdminController;
use App\Database\Connection;
use App\Http\BasicAuth;
use App\Http\Cors;
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

$pdo = Connection::get($config);
$controller = new AdminController(new MysqlPageRepository($pdo));

$router = new Router();
$router->get('/pages', [$controller, 'listPages']);
$router->get('/page', [$controller, 'getPage']);
$router->post('/page', [$controller, 'savePage']);

$router->dispatch(Request::fromGlobals());
