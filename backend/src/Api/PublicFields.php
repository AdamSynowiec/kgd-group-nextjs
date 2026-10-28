<?php

declare(strict_types=1);

namespace App\Api;

use App\Support\Editable;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Pola strony widoczne w REST API: TYLKO te, którym w panelu nadano identyfikator ("apiKey" w definicji
 * pola). Identyfikator to stały kontrakt z integracją — niezależny od układu strony, sekcji czy etykiet.
 * Pole bez identyfikatora nie istnieje dla API.
 *
 * Wartości wychodzą bez wewnętrznego opakowania {value, editable, ...}: liczby jako liczby, tabele jako
 * listy obiektów (bez kluczy technicznych zaczynających się od "_"), pliki z biblioteki jako pełne adresy.
 */
final class PublicFields
{
    public const KEY_PATTERN = '/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/';

    /**
     * Opis pól publicznych (do GET /v1/types): identyfikator => {label, type, columns?}.
     * "type" to typ pola z panelu (text, number, asset...), "columns" — klucze wierszy tabeli.
     *
     * @return array<string, array{label: ?string, type: string, columns?: list<string>}>
     */
    public static function describe(array $content): array
    {
        $fields = [];
        self::walkDescribe($content, $fields);

        return $fields;
    }

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

    private static function walkDescribe(mixed $node, array &$fields): void
    {
        if (!is_array($node)) {
            return;
        }
        if (Editable::isEditableNode($node)) {
            $key = $node['apiKey'] ?? null;
            if (is_string($key) && preg_match(self::KEY_PATTERN, $key) === 1 && !array_key_exists($key, $fields)) {
                $value = $node['value'];
                $field = [
                    'label' => is_string($node['label'] ?? null) ? $node['label'] : null,
                    'type' => is_string($node['type'] ?? null) && $node['type'] !== '' ? $node['type'] : get_debug_type($value),
                ];
                if (is_array($value) && array_is_list($value) && $value !== [] && is_array($value[0])) {
                    $columns = [];
                    foreach ($value as $row) {
                        foreach (is_array($row) ? array_keys($row) : [] as $column) {
                            if (is_string($column) && !str_starts_with($column, '_')) {
                                $columns[$column] = true;
                            }
                        }
                    }
                    $field['columns'] = array_keys($columns);
                }
                $fields[$key] = $field;
            }

            return;
        }
        foreach ($node as $child) {
            self::walkDescribe($child, $fields);
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
