<?php

declare(strict_types=1);

namespace App\Api;

use PDO;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Limit zapytań na token w oknie jednej minuty (tabela api_rate_limits). Wynik trafia do nagłówków
 * RateLimit-Limit / RateLimit-Remaining / RateLimit-Reset; po przekroczeniu — 429 z Retry-After.
 */
final class RateLimiter
{
    public const PER_MINUTE = 120;

    public function __construct(private readonly PDO $pdo)
    {
    }

    public function hit(int $tokenId): void
    {
        $now = time();
        $window = $now - ($now % 60);
        $reset = $window + 60 - $now;

        $this->pdo->prepare(
            'INSERT INTO api_rate_limits (token_id, window_start, hits) VALUES (:token, :window, 1) ON DUPLICATE KEY UPDATE hits = hits + 1'
        )->execute(['token' => $tokenId, 'window' => $window]);
        $statement = $this->pdo->prepare('SELECT hits FROM api_rate_limits WHERE token_id = :token AND window_start = :window');
        $statement->execute(['token' => $tokenId, 'window' => $window]);
        $hits = (int) $statement->fetchColumn();

        // Sprzątanie starych okien przy okazji (rzadko — co ~100 zapytań).
        if (random_int(1, 100) === 1) {
            $this->pdo->prepare('DELETE FROM api_rate_limits WHERE window_start < :old')->execute(['old' => $window - 3600]);
        }

        Response::header('RateLimit-Limit', (string) self::PER_MINUTE);
        Response::header('RateLimit-Remaining', (string) max(0, self::PER_MINUTE - $hits));
        Response::header('RateLimit-Reset', (string) $reset);

        if ($hits > self::PER_MINUTE) {
            throw Problem::rateLimited($reset, self::PER_MINUTE);
        }
    }
}
