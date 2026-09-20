<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\ApiException;
use App\Exception\IngestException;
use App\Http\GithubDispatcher;
use App\Http\JsonResponse;
use App\Repository\ActivityLogRepositoryInterface;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/** POST /build dla zewnętrznego systemu (ingest.php) — ten sam workflow co przycisk "Zbuduj stronę" w panelu, bez sesji panelu. */
final class IngestBuildController
{
    public function __construct(
        private readonly GithubDispatcher $dispatcher,
        private readonly ActivityLogRepositoryInterface $activity
    ) {
    }

    public function trigger(string $tokenId): void
    {
        try {
            $dispatchedAt = $this->dispatcher->dispatch();
        } catch (ApiException $exception) {
            // Komunikat może zawierać szczegóły konfiguracji/GitHuba — trafia tylko do logu serwera.
            error_log('[ingest] build: ' . $exception->getMessage());

            throw new IngestException($exception->status(), 'BUILD_TRIGGER_FAILED', 'Could not start the build.');
        }

        $this->activity->log(null, "api:{$tokenId}", 'build.trigger');

        // 202: zlecenie przyjęte, build dopiero się zacznie i potrwa kilka minut.
        JsonResponse::send(['success' => true, 'status' => 'build_triggered', 'dispatched_at' => $dispatchedAt], 202);
    }
}
