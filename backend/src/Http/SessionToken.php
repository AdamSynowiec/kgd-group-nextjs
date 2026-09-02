<?php

declare(strict_types=1);

namespace App\Http;

use App\Exception\ApiException;
use JsonException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Podpisany, bezstanowy token sesji (HMAC-SHA256) — bez tabeli `sessions`,
 * bez cookie. Sprawdzenie tokenu (verify()) NIE dotyka bazy danych: to
 * zwykła weryfikacja podpisu, więc panel może potwierdzić ważną sesję nawet
 * wtedy, gdy baza akurat nie odpowiada. Tylko WYDANIE tokenu (login) wymaga
 * bazy — trzeba sprawdzić hasło.
 *
 * Format: base64url(JSON payloadu) . "." . base64url(HMAC payloadu).
 * Nie jest to JWT (inny, prostszy nagłówek/zapis), ale ta sama idea.
 */
final class SessionToken
{
    private const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dni

    public function __construct(private readonly string $secret)
    {
    }

    /**
     * @param array<string, mixed> $claims
     */
    public function issue(array $claims, int $ttlSeconds = self::DEFAULT_TTL_SECONDS): string
    {
        $this->assertConfigured();

        $payload = $claims;
        $payload['exp'] = time() + $ttlSeconds;

        try {
            $json = json_encode($payload, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new ApiException('Nie udało się wystawić tokenu sesji.', 500);
        }

        $encodedPayload = self::base64UrlEncode($json);

        return $encodedPayload . '.' . $this->sign($encodedPayload);
    }

    /** @return array<string, mixed>|null null = token pusty, uszkodzony, źle podpisany albo wygasły. */
    public function verify(string $token): ?array
    {
        if ($this->secret === '') {
            return null;
        }

        $parts = explode('.', $token, 2);
        if (count($parts) !== 2) {
            return null;
        }

        [$encodedPayload, $signature] = $parts;

        if (!hash_equals($this->sign($encodedPayload), $signature)) {
            return null;
        }

        $json = self::base64UrlDecode($encodedPayload);
        if ($json === false) {
            return null;
        }

        $claims = json_decode($json, true);
        if (!is_array($claims) || !isset($claims['exp']) || !is_int($claims['exp'])) {
            return null;
        }

        if ($claims['exp'] < time()) {
            return null;
        }

        return $claims;
    }

    private function assertConfigured(): void
    {
        if ($this->secret === '') {
            throw new ApiException('Panel nie ma skonfigurowanego SESSION_SECRET w .env.', 500);
        }
    }

    private function sign(string $data): string
    {
        return self::base64UrlEncode(hash_hmac('sha256', $data, $this->secret, true));
    }

    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string|false
    {
        $remainder = strlen($data) % 4;
        if ($remainder !== 0) {
            $data .= str_repeat('=', 4 - $remainder);
        }

        return base64_decode(strtr($data, '-_', '+/'), true);
    }
}
