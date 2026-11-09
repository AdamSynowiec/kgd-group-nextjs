<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\ApiException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\ActivityLogRepositoryInterface;
use App\Support\ContentDiff;
use App\Support\PageReview;
use JsonException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Akceptacja zmian edytorów (PageReview.php) — panel: "Zmiany do akceptacji" (admin) i
 * "Powiadom o zmianach" (edytor). Uprawnienia tras — admin.php.
 */
final class ReviewController
{
    public function __construct(
        private readonly PageReview $review,
        private readonly ActivityLogRepositoryInterface $activity
    ) {
    }

    /** GET /changes — strony z niezatwierdzonymi zmianami (pole po polu), prośby, historia. */
    public function overview(): void
    {
        JsonResponse::ok($this->review->overview());
    }

    /**
     * POST /changes/approve  body: {"slug"?: "/o-nas", "key"?: "[\"sections\",2,...]"}
     * — pole, cała strona (bez "key") albo wszystko (bez "slug").
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     */
    public function approve(Request $request, ?array $currentSession): void
    {
        [$slug, $key] = $this->target($request);
        $login = $currentSession['login'] ?? null;
        $count = $this->review->approve($slug, $key, $login);
        $this->activity->log($currentSession['userId'] ?? null, $login, 'changes.approve', $slug ?? 'wszystkie', $key === null ? null : ['field' => $key]);

        JsonResponse::ok(['approved' => $count]);
    }

    /**
     * POST /changes/revert  body: {"slug": "/o-nas", "key"?: "..."} — pole albo cała strona
     * wraca do wersji zatwierdzonej (nowa strona — zostaje usunięta).
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     */
    public function revert(Request $request, ?array $currentSession): void
    {
        [$slug, $key] = $this->target($request);
        if ($slug === null) {
            throw new ApiException('Brak strony ("slug").', 400);
        }
        $login = $currentSession['login'] ?? null;
        $count = $this->review->revert($slug, $key, $login);
        $this->activity->log($currentSession['userId'] ?? null, $login, 'changes.revert', $slug, $key === null ? null : ['field' => $key]);

        JsonResponse::ok(['reverted' => $count]);
    }

    /**
     * GET /changes/mine — moje oczekujące zmiany i otwarta prośba (przycisk edytora).
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     */
    public function mine(?array $currentSession): void
    {
        JsonResponse::ok($this->review->mine($currentSession['userId'] ?? null, $currentSession['login'] ?? ''));
    }

    /**
     * POST /changes/request  body: {"message": "Zmieniłem ceny w Foxhills"} — "Powiadom o zmianach".
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     */
    public function request(Request $request, ?array $currentSession): void
    {
        try {
            $body = $request->jsonBody();
        } catch (JsonException) {
            throw new ApiException('Niepoprawny JSON.', 400);
        }
        $login = $currentSession['login'] ?? null;
        if ($login === null || $login === '') {
            throw new ApiException('Prośba wymaga zalogowania.', 401);
        }
        $mine = $this->review->mine($currentSession['userId'] ?? null, $login);
        if ($mine['pending'] === 0) {
            throw new ApiException('Nie masz zmian czekających na akceptację.', 409);
        }
        $message = is_string($body['message'] ?? null) ? $body['message'] : '';
        $id = $this->review->requestReview($currentSession['userId'] ?? null, $login, $message);
        $this->activity->log($currentSession['userId'] ?? null, $login, 'changes.request', null, ['pending' => $mine['pending']]);

        JsonResponse::ok(['id' => $id, 'pending' => $mine['pending']]);
    }

    /** @return array{0: ?string, 1: ?string} */
    private function target(Request $request): array
    {
        try {
            $body = $request->jsonBody();
        } catch (JsonException) {
            throw new ApiException('Niepoprawny JSON.', 400);
        }
        $slug = is_string($body['slug'] ?? null) && $body['slug'] !== '' ? $body['slug'] : null;
        $key = is_string($body['key'] ?? null) && $body['key'] !== '' ? $body['key'] : null;
        if ($key !== null && ($slug === null || ContentDiff::pathFromKey($key) === null)) {
            throw new ApiException('Nieprawidłowe pole.', 400);
        }

        return [$slug, $key];
    }
}
