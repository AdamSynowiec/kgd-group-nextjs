<?php

declare(strict_types=1);

namespace App\Support;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Odpowiednik src/lib/editable.ts po stronie PHP — ta sama konwencja
 * {"value": ..., "editable": bool} musi być rozpoznawana identycznie
 * po obu stronach, inaczej frontend i backend zaczną się nie zgadzać
 * co do tego, które pole jest czym.
 */
final class Editable
{
    public static function isEditableNode(mixed $node): bool
    {
        return is_array($node)
            && array_key_exists('value', $node)
            && array_key_exists('editable', $node)
            && is_bool($node['editable']);
    }

    /** Wyciąga wartość niezależnie od tego, czy pole jest opakowane (kompatybilność wsteczna). */
    public static function unwrap(mixed $node): mixed
    {
        return self::isEditableNode($node) ? $node['value'] : $node;
    }
}
