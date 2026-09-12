<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\ApiException;
use App\Http\GithubDispatcher;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\ActivityLogRepositoryInterface;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/** Przycisk "Zbuduj stronę" w panelu — odpala GitHub Actions i pozwala śledzić status bez wychodzenia z /admin. */
final class BuildController
{
    public function __construct(
        private readonly GithubDispatcher $dispatcher,
        private readonly ActivityLogRepositoryInterface $activity
    ) {
    }

    /**
     * POST /build
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     */
    public function trigger(?array $currentSession): void
    {
        $dispatchedAt = $this->dispatcher->dispatch();

        // Ta trasa gatuje przez Authorization::requireResilient() (patrz
        // admin.php) — z fallbackiem do bezbazowego SessionAuth::requireRole('admin'),
        // gdy baza akurat nie odpowiada. Ten log więc MOŻE się nie zapisać w
        // takiej sytuacji — akceptowane świadomie, log nie może być
        // warunkiem działania przycisku odzyskiwania po awarii.
        $this->activity->log($currentSession['userId'] ?? null, $currentSession['login'] ?? null, 'build.trigger');

        JsonResponse::ok(['triggered' => true, 'dispatchedAt' => $dispatchedAt]);
    }

    /** GET /build/status?since=2026-09-01T13:00:00Z — panel odpytuje to cyklicznie po kliknięciu. */
    public function status(Request $request): void
    {
        $since = $request->query['since'] ?? null;

        if (!is_string($since) || $since === '') {
            throw new ApiException('Brak wymaganego parametru "since".', 400);
        }

        $status = $this->dispatcher->findRunStatus($since);

        // null = GitHub jeszcze nie pokazuje przebiegu na liście (typowe kilka
        // sekund po dispatchu) — "pending" mówi frontendowi "pytaj dalej", to
        // nie błąd.
        JsonResponse::ok($status ?? ['status' => 'pending', 'conclusion' => null, 'htmlUrl' => null, 'runNumber' => null]);
    }
}
