<?php

declare(strict_types=1);

use App\Controller\PageController;
use App\Database\Connection;
use App\Http\Cors;
use App\Http\Request;
use App\Http\Router;
use App\Repository\MysqlPageRepository;

/**
 * Jedyny plik wystawiony publicznie. Wszystko poza tym katalogiem (src/, .env)
 * powinno leżeć poza webrootem hostingu — patrz .htaccess obok tego pliku.
 */

$config = require __DIR__ . '/../src/bootstrap.php';

Cors::handle($config);

$pdo = Connection::get($config);
$controller = new PageController(new MysqlPageRepository($pdo));

$router = new Router();
$router->get('/api/pages', [$controller, 'index']);
$router->get('/api/page', [$controller, 'show']);

$router->dispatch(Request::fromGlobals());
