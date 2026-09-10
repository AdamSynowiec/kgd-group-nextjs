<?php

declare(strict_types=1);

namespace App\Support;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Odpowiednik src/lib/editable.ts po stronie PHP — ta sama konwencja
 * {"value": ..., "editable": bool, "type": FieldType} musi być rozpoznawana
 * identycznie po obu stronach, inaczej frontend i backend zaczną się nie
 * zgadzać co do tego, które pole jest czym.
 */
final class Editable
{
    /** Dozwolone wartości "type" — jedyne edytory, jakie zna panel (patrz src/lib/fieldType.ts). */
    public const FIELD_TYPES = ['string', 'bool', 'number', 'table', 'asset', 'richtext'];

    public static function isEditableNode(mixed $node): bool
    {
        return is_array($node)
            && array_key_exists('value', $node)
            && array_key_exists('editable', $node)
            && is_bool($node['editable']);
    }

    public static function isValidType(mixed $type): bool
    {
        return is_string($type) && in_array($type, self::FIELD_TYPES, true);
    }

    /** Wyciąga wartość niezależnie od tego, czy pole jest opakowane (kompatybilność wsteczna). */
    public static function unwrap(mixed $node): mixed
    {
        return self::isEditableNode($node) ? $node['value'] : $node;
    }
}
