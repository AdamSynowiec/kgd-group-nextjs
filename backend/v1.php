<?php

declare(strict_types=1);

define('APP_ENTRY', true);

use App\Api\Auth;
use App\Api\Problem;
use App\Api\RateLimiter;
use App\Api\Response;
use App\Api\V1\PagesController;
use App\Database\Connection;
use App\Repository\MysqlApiTokenRepository;

/**
 * REST API v1 (server-to-server) — osobny front controller, jak ingest.php: własna autoryzacja
 * (token z panelu: Ustawienia → Tokeny API, "Authorization: Bearer"), odpowiedzi JSON, błędy
 * w formacie RFC 9457 (application/problem+json). Bez CORS — nie jest do wołania z przeglądarki.
 *
 * Adres: /api/v1/pages (reguła w backend/.htaccess) albo zawsze działające
 *        /api/v1.php?route=/pages — hosting na nginx ignoruje .htaccess.
 * Specyfikacja: backend/docs/api-v1.openapi.yaml.
 *
 * Dodając endpoint: wpis w $routes (wymagany zakres + kontroler) i opis w specyfikacji OpenAPI.
 */

$config = require __DIR__ . '/src/bootstrap.php';

$route = '/' . trim((string) ($_GET['route'] ?? ''), '/');
$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$requestId = bin2hex(random_bytes(8));
$siteUrl = rtrim($config->get('SITE_URL', 'https://kgd-group.pl'), '/');

Response::header('X-Request-Id', $requestId);

/** @var array<string, array{scope: string, handler: callable(PDO): never}> $routes */
$routes = [
    '/pages' => [
        'scope' => 'pages:read',
        'handler' => static fn (PDO $pdo) => (new PagesController($pdo, $siteUrl))->index($_GET),
    ],
];

try {
    if (!isset($routes[$route])) {
        throw Problem::notFound("There is no endpoint at /v1{$route}.");
    }
    if (!in_array($method, ['GET', 'HEAD'], true)) {
        throw Problem::methodNotAllowed(['GET', 'HEAD']);
    }

    $pdo = Connection::get($config);
    $token = (new Auth(new MysqlApiTokenRepository($pdo), $config))->require($routes[$route]['scope']);
    (new RateLimiter($pdo))->hit($token['id']);

    $routes[$route]['handler']($pdo);
} catch (Problem $problem) {
    Response::problem($problem, $siteUrl . '/api/v1/docs', '/api/v1' . $route);
} catch (Throwable $exception) {
    // Szczegóły tylko do logu serwera (z identyfikatorem zapytania) — klient dostaje ogólny błąd i X-Request-Id.
    error_log("[api v1] {$requestId} " . $exception);
    Response::problem(Problem::internal(), $siteUrl . '/api/v1/docs', '/api/v1' . $route);
}
