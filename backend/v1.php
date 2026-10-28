<?php

declare(strict_types=1);

define('APP_ENTRY', true);

use App\Api\Auth;
use App\Api\Problem;
use App\Api\RateLimiter;
use App\Api\Response;
use App\Api\V1\Catalog;
use App\Api\V1\Links;
use App\Api\V1\PagesController;
use App\Api\V1\TypesController;
use App\Database\Connection;
use App\Repository\MysqlApiTokenRepository;

/**
 * REST API v1 (server-to-server) — osobny front controller, jak ingest.php: własna autoryzacja
 * (token z panelu: Ustawienia → Tokeny API, "Authorization: Bearer"), odpowiedzi JSON, błędy
 * w formacie RFC 9457 (application/problem+json). Bez CORS — nie jest do wołania z przeglądarki.
 *
 * Adres: /api/v1/pages/rudava-park (reguła w backend/.htaccess / konfiguracji serwera) albo zapasowe
 *        /api/v1.php?route=/pages/rudava-park. Opis: backend/docs/rest-api-v1.md.
 * Specyfikacja: backend/docs/api-v1.openapi.yaml.
 *
 * Dodając endpoint: wpis w $routes (wzorzec ścieżki, wymagany zakres, kontroler) i opis w specyfikacji
 * OpenAPI. Wzorzec to wyrażenie regularne bez ograniczników; nazwane grupy trafiają do kontrolera.
 */

$config = require __DIR__ . '/src/bootstrap.php';

$route = '/' . trim((string) ($_GET['route'] ?? ''), '/');
$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$requestId = bin2hex(random_bytes(8));
$siteUrl = rtrim($config->get('SITE_URL', 'https://kgd-group.pl'), '/');

Response::header('X-Request-Id', $requestId);

/** @var list<array{pattern: string, scope: string, handler: callable(PDO, array<string, string>): never}> $routes */
$routes = [
    [
        // Punkt wejścia: co jest dostępne (HATEOAS-lite) — integracja nie musi znać adresów z góry.
        'pattern' => '/',
        'scope' => 'pages:read',
        'handler' => static fn (PDO $pdo, array $params) => Response::json(['links' => [
            'pages' => Links::to('/pages'),
            'types' => Links::to('/types'),
            'docs' => $siteUrl . '/api/v1/docs',
        ]]),
    ],
    [
        'pattern' => '/pages',
        'scope' => 'pages:read',
        'handler' => static fn (PDO $pdo, array $params) => (new PagesController(new Catalog($pdo, $siteUrl)))->index($_GET),
    ],
    [
        // Identyfikator strony nadany w panelu ("rudava-park") albo jej numeryczne id ("7").
        'pattern' => '/pages/(?<page>[a-z][a-z0-9-]{0,63}|[1-9][0-9]{0,18})',
        'scope' => 'pages:read',
        'handler' => static fn (PDO $pdo, array $params) => (new PagesController(new Catalog($pdo, $siteUrl)))->show($params['page'], $_GET),
    ],
    [
        'pattern' => '/types',
        'scope' => 'pages:read',
        'handler' => static fn (PDO $pdo, array $params) => (new TypesController(new Catalog($pdo, $siteUrl)))->index($_GET),
    ],
];

try {
    $matched = null;
    $params = [];
    foreach ($routes as $candidate) {
        if (preg_match('#^' . $candidate['pattern'] . '$#', $route, $groups) === 1) {
            $matched = $candidate;
            $params = array_filter($groups, 'is_string', ARRAY_FILTER_USE_KEY);
            break;
        }
    }
    if ($matched === null) {
        throw Problem::notFound("There is no endpoint at /v1{$route}.");
    }
    if (!in_array($method, ['GET', 'HEAD'], true)) {
        throw Problem::methodNotAllowed(['GET', 'HEAD']);
    }

    $pdo = Connection::get($config);
    $token = (new Auth(new MysqlApiTokenRepository($pdo), $config))->require($matched['scope']);
    (new RateLimiter($pdo))->hit($token['id']);

    $matched['handler']($pdo, $params);
} catch (Problem $problem) {
    Response::problem($problem, $siteUrl . '/api/v1/docs', '/api/v1' . $route);
} catch (Throwable $exception) {
    // Szczegóły tylko do logu serwera (z identyfikatorem zapytania) — klient dostaje ogólny błąd i X-Request-Id.
    error_log("[api v1] {$requestId} " . $exception);
    Response::problem(Problem::internal(), $siteUrl . '/api/v1/docs', '/api/v1' . $route);
}
