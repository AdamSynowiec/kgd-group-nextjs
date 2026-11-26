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

    /** Tryby z okna "Zbuduj stronę" (= input "scope" workflow, patrz .github/workflows/deploy.yml). */
    private const MODES = ['pages', 'investments', 'admin', 'site', 'full'];

    /** Buildy obejmujące cały serwis (bez bloga albo z blogiem) — od nich liczymy "zmienione strony". */
    private const COVERING_BUILDS = ['build.trigger', 'build.trigger.site', 'build.trigger.full'];

    private const MAX_PAGES = 50;

    /**
     * POST /build  JSON: {"mode": "pages" | "investments" | "admin" | "site" | "full", "pages": ["/inwestycja/xyz", …]}
     *
     *   pages       — tylko wybrane strony (z podstronami) — "Szybki build"
     *   investments — wszystkie inwestycje (/inwestycja/**), bez bloga
     *   admin       — panel /admin + backend /api
     *   site        — cały serwis bez bloga (dawny "quick" — "quick" nadal działa jako alias)
     *   full        — wszystko, z blogiem
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     */
    public function trigger(Request $request, ?array $currentSession): void
    {
        $body = $request->jsonBody();
        $mode = $body['mode'] ?? 'site';
        if ($mode === 'quick') {
            $mode = 'site';
        }
        if (!is_string($mode) || !in_array($mode, self::MODES, true)) {
            throw new ApiException('Nieznany tryb budowania.', 400);
        }

        $pages = [];
        if ($mode === 'pages') {
            $raw = is_array($body['pages'] ?? null) ? $body['pages'] : [];
            foreach ($raw as $slug) {
                if (!is_string($slug) || preg_match('#^/[a-z0-9/_-]*$#i', $slug) !== 1 || str_contains($slug, '..') || str_contains($slug, '//')) {
                    throw new ApiException('Niepoprawny adres strony do budowania.', 400);
                }
                $pages[rtrim($slug, '/') === '' ? '/' : rtrim($slug, '/')] = true;
            }
            $pages = array_keys($pages);
            if ($pages === []) {
                throw new ApiException('Wybierz co najmniej jedną stronę do szybkiego buildu.', 400);
            }
            if (count($pages) > self::MAX_PAGES) {
                throw new ApiException('Za dużo stron do szybkiego buildu (maks. ' . self::MAX_PAGES . ') — wybierz "Build pełny".', 400);
            }
        }

        // skip_blog ustawia też workflow na podstawie scope — przekazywany dla czytelności przebiegu w GitHubie.
        $inputs = [
            'scope' => $mode,
            'pages' => implode(',', $pages),
            'skip_blog' => $mode === 'full' ? 'false' : 'true',
        ];

        $dispatchedAt = $this->dispatcher->dispatch($inputs);

        // Ta trasa gatuje przez Authorization::requireResilient() (patrz
        // admin.php) — z fallbackiem do bezbazowego SessionAuth::requireRole('admin'),
        // gdy baza akurat nie odpowiada. Ten log więc MOŻE się nie zapisać w
        // takiej sytuacji — akceptowane świadomie, log nie może być
        // warunkiem działania przycisku odzyskiwania po awarii.
        $this->activity->log(
            $currentSession['userId'] ?? null,
            $currentSession['login'] ?? null,
            "build.trigger.{$mode}",
            null,
            $pages !== [] ? ['pages' => $pages] : null
        );

        JsonResponse::ok(['triggered' => true, 'dispatchedAt' => $dispatchedAt, 'mode' => $mode]);
    }

    /** GET /build/changes — strony zmienione od ostatniego builda całego serwisu (podpowiedź do "Szybkiego buildu"). */
    public function changes(): void
    {
        JsonResponse::ok($this->activity->pagesChangedSinceBuild(self::COVERING_BUILDS));
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
