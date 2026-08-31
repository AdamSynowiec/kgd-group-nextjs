<?php

declare(strict_types=1);

namespace App\Support;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Reguły adresu strony — lustrzane odbicie normalizeSlug()/slugToSegments()
 * z src/lib/content.ts we frontendzie Next.js. Backend i frontend muszą się
 * zgadzać co do formatu sluga: zaczyna się od "/", bez końcowego "/",
 * strona główna to literalnie "/", segmenty to kebab-case.
 */
final class Slug
{
    private const ALLOWED_SEGMENT = '/^[a-z0-9]+(?:-[a-z0-9]+)*$/';

    /** Segmenty ścieżki żądania (bez wiodącego prefiksu endpointu) -> znormalizowany slug. */
    public static function fromSegments(array $segments): string
    {
        $segments = array_values(array_filter(
            $segments,
            static fn (string $segment): bool => $segment !== ''
        ));

        if ($segments === []) {
            return '/';
        }

        return '/' . implode('/', $segments);
    }

    /** Czy slug ma bezpieczny, oczekiwany kształt — same segmenty kebab-case. */
    public static function isValid(string $slug): bool
    {
        if ($slug === '/') {
            return true;
        }

        foreach (explode('/', trim($slug, '/')) as $segment) {
            if (preg_match(self::ALLOWED_SEGMENT, $segment) !== 1) {
                return false;
            }
        }

        return true;
    }
}
