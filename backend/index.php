<?php

declare(strict_types=1);

define('APP_ENTRY', true);

use App\Controller\PageController;
use App\Database\Connection;
use App\Http\Cors;
use App\Http\Request;
use App\Http\Router;
use App\Repository\MysqlPageRepository;

/**
 * Jedyny plik, który ma być wywoływany bezpośrednio. Trasa przychodzi przez
 * ?route=, nie przez ładny URL — patrz komentarz w Http/Request.php, dlaczego
 * (część hostingów współdzielonych ignoruje .htaccess/mod_rewrite).
 *
 * APP_ENTRY to prosta, niezależna od serwera blokada: każdy plik w src/
 * sam sprawdza tę stałą na starcie i przerywa działanie, jeśli ktoś zażąda
 * go bezpośrednio z przeglądarki, z pominięciem tego pliku.
 */

$config = require __DIR__ . '/src/bootstrap.php';

Cors::handle($config);

$pdo = Connection::get($config);
$controller = new PageController(new MysqlPageRepository($pdo));

$router = new Router();
$router->get('/pages', [$controller, 'index']);
$router->get('/page', [$controller, 'show']);

$router->dispatch(Request::fromGlobals());
