<?php

declare(strict_types=1);

namespace App\Api;

use App\Support\Editable;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Pola strony widoczne w REST API: TYLKO te, którym w panelu nadano klucz API ("apiKey" w definicji
 * pola). Klucz to stały kontrakt z integracją — niezależny od układu strony, sekcji czy etykiet.
 * Pole bez klucza nie istnieje dla API.
 *
 * Wartości wychodzą bez wewnętrznego opakowania {value, editable, ...}: liczby jako liczby, tabele jako
 * listy obiektów (bez kluczy technicznych zaczynających się od "_"), pliki z biblioteki jako pełne adresy.
 */
final class PublicFields
{
    public const KEY_PATTERN = '/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/';

    /** @return array<string, mixed> apiKey => wartość */
    public static function of(array $content, string $siteUrl): array
    {
        $fields = [];
        self::walk($content, $fields, rtrim($siteUrl, '/'));
        ksort($fields);

        return $fields;
    }

    private static function walk(mixed $node, array &$fields, string $siteUrl): void
    {
        if (!is_array($node)) {
            return;
        }
        if (Editable::isEditableNode($node)) {
            $key = $node['apiKey'] ?? null;
            if (is_string($key) && preg_match(self::KEY_PATTERN, $key) === 1 && !array_key_exists($key, $fields)) {
                $fields[$key] = self::value($node['value'], (string) ($node['type'] ?? ''), $siteUrl);
            }

            return;
        }
        foreach ($node as $child) {
            self::walk($child, $fields, $siteUrl);
        }
    }

    private static function value(mixed $value, string $type, string $siteUrl): mixed
    {
        if ($type === 'asset' && is_string($value)) {
            return self::absolute($value, $siteUrl);
        }
        if (is_array($value)) {
            return self::clean($value, $siteUrl);
        }

        return $value;
    }

    /** Tabele/listy: bez kluczy technicznych ("_id", "_ref"...), adresy plików z uploadu jako pełne URL-e. */
    private static function clean(array $value, string $siteUrl): array
    {
        $result = [];
        foreach ($value as $key => $item) {
            if (is_string($key) && str_starts_with($key, '_')) {
                continue;
            }
            $result[$key] = is_array($item) ? self::clean($item, $siteUrl) : (is_string($item) ? self::absolute($item, $siteUrl) : $item);
        }

        return array_is_list($value) ? array_values($result) : $result;
    }

    /** "/api/uploads/x.webp" / "/investments/..." (ścieżka pliku) -> "https://domena/..."; inne teksty bez zmian. */
    private static function absolute(string $value, string $siteUrl): string
    {
        if (preg_match('#^/(api/uploads|investments|assets|home|kgd-building)/[^\s]+\.(webp|jpe?g|png|gif|svg|avif|pdf)$#i', $value) === 1) {
            return $siteUrl . $value;
        }

        return $value;
    }
}
