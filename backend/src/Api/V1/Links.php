<?php

declare(strict_types=1);

namespace App\Api\V1;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Linki w odpowiedziach API — w tej samej formie adresu, którą przyszło zapytanie:
 * ładnej (/api/v1/pages/x) albo zapasowej przez front controller (/api/v1.php?route=/pages/x).
 */
final class Links
{
    /** @param array<string, mixed> $query */
    public static function to(string $path, array $query = []): string
    {
        $viaFrontController = str_contains((string) ($_SERVER['REQUEST_URI'] ?? ''), 'v1.php');
        $query = array_filter($query, static fn (mixed $value): bool => $value !== null && $value !== '');
        $encoded = http_build_query($query, '', '&', PHP_QUERY_RFC3986);

        if ($viaFrontController) {
            return '/api/v1.php?route=' . $path . ($encoded === '' ? '' : '&' . $encoded);
        }

        return '/api/v1' . $path . ($encoded === '' ? '' : '?' . $encoded);
    }
}
