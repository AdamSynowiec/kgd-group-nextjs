<?php

declare(strict_types=1);

namespace App\Controller;

use App\Api\Auth;
use App\Exception\ApiException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\ActivityLogRepositoryInterface;
use App\Repository\MysqlApiTokenRepository;
use JsonException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * "Tokeny API" w Ustawieniach panelu — tokeny REST API v1 (backend/v1.php).
 * Pełny token zwracany jest wyłącznie w odpowiedzi na utworzenie; potem tylko prefiks.
 */
final class ApiTokenController
{
    private const MAX_DAYS = 3650;

    public function __construct(
        private readonly MysqlApiTokenRepository $tokens,
        private readonly ActivityLogRepositoryInterface $activity
    ) {
    }

    /** GET /api-tokens — lista tokenów + dostępne zakresy. */
    public function list(): void
    {
        JsonResponse::ok(['tokens' => $this->tokens->all(), 'scopes' => Auth::SCOPES]);
    }

    /**
     * POST /api-tokens  {"name": "Integracja CRM", "scopes": ["pages:read"], "expiresInDays": 90|null}
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $session
     */
    public function create(Request $request, ?array $session): void
    {
        $body = self::body($request);

        $name = is_string($body['name'] ?? null) ? trim($body['name']) : '';
        if ($name === '' || mb_strlen($name) > 120) {
            throw new ApiException('Podaj nazwę tokenu (maks. 120 znaków), np. nazwę integracji.', 422);
        }

        $scopes = is_array($body['scopes'] ?? null) ? array_values(array_unique(array_filter($body['scopes'], 'is_string'))) : [];
        $unknown = array_diff($scopes, array_keys(Auth::SCOPES));
        if ($scopes === [] || $unknown !== []) {
            throw new ApiException($scopes === [] ? 'Wybierz co najmniej jeden zakres.' : 'Nieznany zakres: ' . implode(', ', $unknown) . '.', 422);
        }

        $expiresAt = null;
        if (($body['expiresInDays'] ?? null) !== null) {
            $days = filter_var($body['expiresInDays'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => self::MAX_DAYS]]);
            if ($days === false) {
                throw new ApiException('Ważność tokenu: od 1 do ' . self::MAX_DAYS . ' dni albo bez wygaśnięcia.', 422);
            }
            $expiresAt = time() + $days * 86400;
        }

        $created = $this->tokens->create($name, $scopes, $expiresAt, $session['login'] ?? null);
        $this->activity->log($session['userId'] ?? null, $session['login'] ?? null, 'api.tokens.create', $name, ['id' => $created['record']['id'], 'scopes' => $scopes]);

        JsonResponse::ok(['token' => $created['token'], 'record' => $created['record']]);
    }

    /**
     * POST /api-tokens/revoke  {"id": 3} — token przestaje działać natychmiast.
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $session
     */
    public function revoke(Request $request, ?array $session): void
    {
        $body = self::body($request);
        $id = filter_var($body['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $record = $id === false ? null : $this->tokens->find($id);
        if ($record === null) {
            throw new ApiException('Nie ma takiego tokenu.', 404);
        }
        if ($this->tokens->revoke($record['id'])) {
            $this->activity->log($session['userId'] ?? null, $session['login'] ?? null, 'api.tokens.revoke', $record['name'], ['id' => $record['id']]);
        }

        JsonResponse::ok($this->tokens->find($record['id']));
    }

    /** @return array<string, mixed> */
    private static function body(Request $request): array
    {
        try {
            return $request->jsonBody();
        } catch (JsonException) {
            throw new ApiException('Niepoprawny JSON.', 400);
        }
    }
}
