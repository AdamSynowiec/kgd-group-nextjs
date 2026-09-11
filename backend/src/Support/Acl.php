<?php

declare(strict_types=1);

namespace App\Support;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Odpowiednik src/lib/acl.ts po stronie PHP. Sprawdza dostęp do CAŁEJ strony
 * ($currentSession['role'] vs. $content['acl'] w AdminController) oraz do
 * pojedynczego pola ($stored['acl'] w EditableMerge::apply()) — ten sam
 * kształt {"role": string, "permission": "read"|"write"|"read/write"} w obu
 * przypadkach, więc jedna klasa wystarcza.
 *
 * Reguła (identyczna po obu stronach): brak "acl" -> tylko rola "admin".
 * Rola "admin" przechodzi zawsze. $role === null oznacza wyłączone
 * uwierzytelnianie (patrz SessionAuth::guard, ADMIN_AUTH_ENABLED=false) —
 * wtedy, tak jak w SessionAuth::requireRole(), nie ma czego porównywać, więc
 * przepuszcza wszystko.
 *
 * To jest ta sama, realna granica bezpieczeństwa co EditableMerge::apply()
 * (patrz jego komentarz) — nie tylko podpowiedź dla panelu.
 */
final class Acl
{
    public const PERMISSIONS = ['read', 'write', 'read/write'];

    public static function isValid(mixed $acl): bool
    {
        return is_array($acl)
            && is_string($acl['role'] ?? null) && $acl['role'] !== ''
            && in_array($acl['permission'] ?? null, self::PERMISSIONS, true);
    }

    public static function canRead(mixed $acl, ?string $role): bool
    {
        return self::check($acl, $role, 'read');
    }

    public static function canWrite(mixed $acl, ?string $role): bool
    {
        return self::check($acl, $role, 'write');
    }

    private static function check(mixed $acl, ?string $role, string $need): bool
    {
        if ($role === null) {
            return true;
        }

        if ($role === 'admin') {
            return true;
        }

        if (!self::isValid($acl)) {
            return false;
        }

        /** @var array{role: string, permission: string} $acl */
        if ($acl['role'] !== $role) {
            return false;
        }

        return $acl['permission'] === $need || $acl['permission'] === 'read/write';
    }
}
