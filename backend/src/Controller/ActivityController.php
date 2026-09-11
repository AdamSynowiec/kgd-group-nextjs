<?php

declare(strict_types=1);

namespace App\Controller;

use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\ActivityLogRepositoryInterface;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Historia aktywności kont ("Aktywność" w Ustawieniach) — kto co zrobił w
 * panelu, patrz db/013_create_activity_log.sql. Wymaga uprawnienia
 * "activity.list" (patrz admin.php: Authorization::require()) — domyślnie
 * ma je tylko rola "admin" (nie nadane "editor"/"blog" w seedzie), więc
 * tylko admin widzi to z automatu, tym samym mechanizmem co reszta panelu.
 */
final class ActivityController
{
    private const DEFAULT_LIMIT = 50;
    private const MAX_LIMIT = 200;

    public function __construct(private readonly ActivityLogRepositoryInterface $activity)
    {
    }

    /** GET /activity?limit=50&offset=0 — najnowsze najpierw. */
    public function list(Request $request): void
    {
        $limit = $this->intParam($request, 'limit', self::DEFAULT_LIMIT, 1, self::MAX_LIMIT);
        $offset = $this->intParam($request, 'offset', 0, 0, PHP_INT_MAX);

        // "total" w samym "data" (nie w "meta") — adminApi.ts::request() zwraca
        // wołającemu tylko pole "data" odpowiedzi, "meta" nigdzie po stronie
        // frontendu nie jest dziś czytane (patrz np. fetchPage()).
        JsonResponse::ok(['items' => $this->activity->list($limit, $offset), 'total' => $this->activity->count()]);
    }

    private function intParam(Request $request, string $name, int $default, int $min, int $max): int
    {
        $raw = $request->query[$name] ?? null;

        if (!is_string($raw) || !ctype_digit($raw)) {
            return $default;
        }

        return max($min, min($max, (int) $raw));
    }
}
