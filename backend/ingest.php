<?php

declare(strict_types=1);

define('APP_ENTRY', true);

use App\Controller\ArticleController;
use App\Database\Connection;
use App\Exception\IngestException;
use App\Http\ApiToken;
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
 * Dodając endpoint: nowa metoda w ArticleController + jedna linia w $router.
 */

$config = require __DIR__ . '/src/bootstrap.php';

try {
    $tokenId = ApiToken::authenticate($config);

    $articles = new ArticleController(
        new MysqlPageRepository(Connection::get($config)),
        new MysqlActivityLogRepository(Connection::get($config))
    );

    $router = new Router();
    $router->post('/blog/articles', static function (Request $request) use ($articles, $tokenId): void {
        // Router dopasowuje po prefiksie, a ten endpoint nie przyjmuje żadnego dalszego segmentu.
        if ($request->path !== '/blog/articles') {
            throw new IngestException(404, 'NOT_FOUND', 'Unknown route.');
        }

        $articles->create($tokenId);
    });

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
