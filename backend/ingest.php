<?php

declare(strict_types=1);

define('APP_ENTRY', true);

use App\Controller\ArticleController;
use App\Controller\IngestBuildController;
use App\Database\Connection;
use App\Exception\IngestException;
use App\Http\ApiToken;
use App\Http\GithubDispatcher;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Http\Router;
use App\Repository\MysqlActivityLogRepository;
use App\Repository\MysqlPageRepository;

/**
 * API dla zewnętrznego systemu (server-to-server), osobny front controller od
 * index.php (publiczny odczyt) i admin.php (sesje panelu) — inna autoryzacja
 * (token maszynowy, patrz ApiToken) i inny format odpowiedzi. Celowo BEZ CORS:
 * to API nie jest do wołania z przeglądarki. Trasa jak wszędzie przez ?route=.
 *
 * Dodając endpoint: metoda w kontrolerze + jedna linia w $router poniżej
 * + reguła w backend/.htaccess (ładny adres).
 */

$config = require __DIR__ . '/src/bootstrap.php';

try {
    $tokenId = ApiToken::authenticate($config);

    $pdo = Connection::get($config);
    $activity = new MysqlActivityLogRepository($pdo);

    $articles = new ArticleController(new MysqlPageRepository($pdo), $activity);
    $build = new IngestBuildController(
        new GithubDispatcher(
            $config->get('GITHUB_TOKEN'),
            $config->get('GITHUB_OWNER'),
            $config->get('GITHUB_REPO'),
            $config->get('GITHUB_WORKFLOW', 'deploy.yml'),
            $config->get('GITHUB_REF', 'main')
        ),
        $activity
    );

    // Router dopasowuje po prefiksie, a te endpointy nie przyjmują dalszych segmentów — stąd dokładne dopasowanie ścieżki.
    $exact = static fn (string $path, callable $handler): callable => static function (Request $request) use ($path, $handler): void {
        if ($request->path !== $path) {
            throw new IngestException(404, 'NOT_FOUND', 'Unknown route.');
        }

        $handler();
    };

    $router = new Router();
    $router->post('/blog/articles', $exact('/blog/articles', static fn () => $articles->create($tokenId)));
    $router->post('/build', $exact('/build', static fn () => $build->trigger($tokenId)));

    $router->dispatch(Request::fromGlobals());
} catch (IngestException $exception) {
    $error = ['code' => $exception->errorCode, 'message' => $exception->getMessage()];
    if ($exception->fields !== []) {
        $error['fields'] = $exception->fields;
    }

    JsonResponse::send(['success' => false, 'error' => $error], $exception->status());
} catch (Throwable $exception) {
    // Szczegóły tylko do logu serwera — partner dostaje wyłącznie ogólny komunikat.
    error_log('[ingest] ' . $exception);

    JsonResponse::send(
        ['success' => false, 'error' => ['code' => 'INTERNAL_ERROR', 'message' => 'Internal server error.']],
        500
    );
}
