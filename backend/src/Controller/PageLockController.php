<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\ApiException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\ActivityLogRepositoryInterface;
use App\Repository\MysqlPageLockRepository;
use App\Support\Slug;
use JsonException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Blokada edycji stron w panelu — jedna osoba (jedno otwarcie edytora) naraz na stronę.
 * Panel: przy wejściu do edytora acquire, co ~15 s heartbeat, przy wyjściu release.
 * Zajęta strona -> panel pokazuje "edytuje ją <login>" z wyborem: czekaj albo edytuj
 * mimo to (force — przejęcie, poprzednia osoba traci możliwość zapisu, patrz
 * AdminController::savePage()). Wszystkie odpowiedzi 200 z {acquired|held, holder},
 * żeby panel nie musiał parsować błędów.
 */
final class PageLockController
{
    public function __construct(
        private readonly MysqlPageLockRepository $locks,
        private readonly ActivityLogRepositoryInterface $activity
    ) {
    }

    /**
     * POST /page-lock/acquire  {"slug": "/inwestycja/foxhills", "lockId": "<32 hex>", "force": false}
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $session
     */
    public function acquire(Request $request, ?array $session): void
    {
        [$slug, $lockId, $body] = $this->input($request);
        $force = ($body['force'] ?? false) === true;

        $result = $this->locks->acquire($slug, $lockId, $session['userId'] ?? null, self::login($session), $force);

        if ($result['previous'] !== null) {
            $this->activity->log($session['userId'] ?? null, $session['login'] ?? null, 'pages.lock.takeover', $slug, ['from' => $result['previous']['login']]);
        }

        JsonResponse::ok([
            'acquired' => $result['acquired'],
            'holder' => $this->present($result['holder'], $lockId, $session),
            'ttlSeconds' => MysqlPageLockRepository::TTL_SECONDS,
        ]);
    }

    /**
     * POST /page-lock/heartbeat  {"slug": "...", "lockId": "..."}
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $session
     */
    public function heartbeat(Request $request, ?array $session): void
    {
        [$slug, $lockId] = $this->input($request);
        $holder = $this->locks->heartbeat($slug, $lockId, $session['userId'] ?? null, self::login($session));

        JsonResponse::ok(['held' => $holder === null, 'holder' => $this->present($holder, $lockId, $session)]);
    }

    /** POST /page-lock/release  {"slug": "...", "lockId": "..."} — usuwa tylko własną blokadę. */
    public function release(Request $request): void
    {
        [$slug, $lockId] = $this->input($request);
        $this->locks->release($slug, $lockId);

        JsonResponse::ok(['released' => true]);
    }

    /**
     * GET /page-locks — aktywne blokady (lista stron: "edytuje <login>").
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $session
     */
    public function list(?array $session): void
    {
        $items = array_map(fn (array $lock): array => ['slug' => $lock['slug']] + $this->present($lock, '', $session), $this->locks->listActive());

        JsonResponse::ok($items);
    }

    /**
     * Bez lockId w odpowiedzi — to identyfikator cudzej karty, nie jest potrzebny w panelu.
     *
     * @param array<string, mixed>|null $holder
     * @param array{userId: int, login: string, role: string, exp: int}|null $session
     * @return array<string, mixed>|null
     */
    private function present(?array $holder, string $ownLockId, ?array $session): ?array
    {
        if ($holder === null) {
            return null;
        }

        return [
            'login' => $holder['login'],
            'acquiredAt' => $holder['acquiredAt'],
            'heartbeatAt' => $holder['heartbeatAt'],
            'mine' => $ownLockId !== '' && $holder['lockId'] === $ownLockId,
            // Ta sama osoba w innej karcie / na innym urządzeniu.
            'sameUser' => $session !== null && $holder['userId'] === ($session['userId'] ?? null),
        ];
    }

    /** @return array{0: string, 1: string, 2: array<string, mixed>} */
    private function input(Request $request): array
    {
        try {
            $body = $request->jsonBody();
        } catch (JsonException) {
            throw new ApiException('Niepoprawny JSON.', 400);
        }

        $raw = $body['slug'] ?? null;
        if (!is_string($raw) || $raw === '') {
            throw new ApiException('Brak pola "slug".', 400);
        }
        $slug = Slug::fromSegments(explode('/', trim($raw, '/')));
        if (!Slug::isValid($slug)) {
            throw new ApiException("Nieprawidłowy adres: {$slug}", 400);
        }

        $lockId = $body['lockId'] ?? null;
        if (!is_string($lockId) || preg_match('/^[a-f0-9]{32}$/', $lockId) !== 1) {
            throw new ApiException('Nieprawidłowy "lockId" (32 znaki hex).', 400);
        }

        return [$slug, $lockId, $body];
    }

    /** @param array{userId: int, login: string, role: string, exp: int}|null $session */
    private static function login(?array $session): string
    {
        // Bez sesji tylko w trybie deweloperskim (ADMIN_AUTH_ENABLED=false).
        return $session['login'] ?? 'tryb deweloperski';
    }
}
