<?php

declare(strict_types=1);

namespace App\Support;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Tożsamość strony w REST API v1, niezależna od jej adresu w serwisie:
 *   "apiKey"  (korzeń treści) — identyfikator strony, unikalny w serwisie: /v1/pages/{apiKey},
 *   "apiType" (korzeń treści) — typ treści, wspólny dla stron tego samego rodzaju: /v1/pages?type=…
 *
 * Oba są zwykłymi danymi strony (edytowalne w panelu), nie listą w kodzie. Gdy ich brak, proponowane
 * są z adresu jedną ogólną regułą (suggestKey/suggestType) — przy tworzeniu strony i przy uzupełnianiu
 * istniejących (Ustawienia → Tokeny API).
 */
final class PageIdentity
{
    /** Identyfikator i typ: małe litery, cyfry, "-", zaczyna się od litery. Bezpieczny jako segment URL. */
    public const PATTERN = '/^[a-z][a-z0-9-]{0,63}$/';

    /**
     * "/" -> "home", "/blog" -> "blog", "/inwestycja/rudava-park" -> "rudava-park",
     * "/inwestycja/rudava-park/historia-cen" -> "rudava-park-historia-cen"
     * (pierwszy segment to sekcja serwisu — pomijany, gdy adres jest głębszy).
     */
    public static function suggestKey(string $slug): string
    {
        $segments = self::segments($slug);
        if ($segments === []) {
            return 'home';
        }
        if (count($segments) > 1) {
            array_shift($segments);
        }

        return self::sanitize(implode('-', $segments), 'page');
    }

    /**
     * Strony z tym samym miejscem w strukturze adresów dostają ten sam typ:
     * "/" i "/kontakt" -> "page", "/inwestycja/x" -> "inwestycja", "/blog/x" -> "blog",
     * "/inwestycja/x/historia-cen" -> "historia-cen".
     */
    public static function suggestType(string $slug): string
    {
        $segments = self::segments($slug);

        return match (true) {
            count($segments) <= 1 => 'page',
            count($segments) === 2 => self::sanitize($segments[0], 'page'),
            default => self::sanitize($segments[count($segments) - 1], 'page'),
        };
    }

    /** Pierwszy wolny wariant: "x", "x-2", "x-3"... @param array<string, true> $taken */
    public static function uniqueKey(string $key, array $taken): string
    {
        $candidate = $key;
        for ($n = 2; isset($taken[$candidate]); $n++) {
            $candidate = substr($key, 0, 60) . '-' . $n;
        }

        return $candidate;
    }

    public static function isValid(mixed $value): bool
    {
        return is_string($value) && preg_match(self::PATTERN, $value) === 1;
    }

    /** @return list<string> */
    private static function segments(string $slug): array
    {
        return array_values(array_filter(explode('/', $slug), 'strlen'));
    }

    private static function sanitize(string $value, string $fallback): string
    {
        $value = trim((string) preg_replace('/[^a-z0-9]+/', '-', strtolower($value)), '-');
        if ($value === '' || !ctype_alpha($value[0])) {
            $value = $fallback . ($value === '' ? '' : '-' . $value);
        }

        return rtrim(substr($value, 0, 64), '-');
    }
}
