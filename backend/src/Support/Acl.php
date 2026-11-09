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
 * "acl" to jeden wpis albo lista wpisów (kilka ról) — patrz entries().
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

    /** Pojedynczy wpis {"role", "permission"}. */
    public static function isValid(mixed $acl): bool
    {
        return is_array($acl)
            && is_string($acl['role'] ?? null) && $acl['role'] !== ''
            && in_array($acl['permission'] ?? null, self::PERMISSIONS, true);
    }

    /**
     * "acl" -> lista poprawnych wpisów. Dwa kształty w bazie: jeden wpis {"role", "permission"}
     * (dotychczasowy, np. wpisy bloga) albo lista wpisów [{...}, {...}] — kilka ról z różnym
     * dostępem do jednej strony (ustawiane w panelu: Strony → "Dostęp", PageAclController).
     *
     * @return list<array{role: string, permission: string}>
     */
    public static function entries(mixed $acl): array
    {
        if (self::isValid($acl)) {
            /** @var array{role: string, permission: string} $acl */
            return [['role' => $acl['role'], 'permission' => $acl['permission']]];
        }
        if (!is_array($acl) || !array_is_list($acl)) {
            return [];
        }

        return array_values(array_map(
            static fn (array $entry): array => ['role' => $entry['role'], 'permission' => $entry['permission']],
            array_filter($acl, [self::class, 'isValid'])
        ));
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

        foreach (self::entries($acl) as $entry) {
            if ($entry['role'] === $role && ($entry['permission'] === $need || $entry['permission'] === 'read/write')) {
                return true;
            }
        }

        return false;
    }
}
