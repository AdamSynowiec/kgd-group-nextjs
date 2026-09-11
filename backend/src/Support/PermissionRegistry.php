<?php

declare(strict_types=1);

namespace App\Support;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Centralny rejestr WSZYSTKICH operacyjnych uprawnień panelu /admin — mirror
 * src/lib/permissions.ts (ta sama zasada co Editable::FIELD_TYPES /
 * src/lib/fieldType.ts). Kształt "<zasób>.<akcja>", jeden string na REALNIE
 * wymuszaną operację (patrz Authorization.php) — nigdy nie tworzony z panelu,
 * w odróżnieniu od ról (db/010) i ich uprawnień (db/011), które SĄ edytowalne
 * z panelu.
 *
 * ODRĘBNE od ACL treści strona/pole (Acl.php, acl.role/acl.permission w
 * pages.content) — to uprawnienia odpowiadają "czy ta operacja jest w ogóle
 * dozwolona", nie "która konkretna strona/pole". Patrz Authorization.php.
 *
 * "build.trigger"/"build.status" SĄ tu zarejestrowane (żeby poprawnie
 * pokazywały się w GET /me i w panelu Uprawnień), ale ich realne wymuszanie
 * na stałe zostaje na starym SessionAuth::requireRole('admin') — patrz
 * komentarz w SessionAuth.php i w admin.php. Powód: te dwie trasy muszą
 * działać nawet gdy baza nie odpowiada (odzyskiwanie po awarii), a
 * Authorization:: wymaga świeżego zapytania do bazy przy każdym sprawdzeniu.
 */
final class PermissionRegistry
{
    public const ALL = [
        'pages.list',
        'pages.read',
        'pages.create',
        'pages.update',
        'pages.delete',
        'assets.upload',
        'build.trigger',
        'build.status',
        'users.list',
        'users.create',
        'users.delete',
        'roles.list',
        'roles.create',
        'roles.delete',
        'roles.permissions.manage',
        'activity.list',
    ];

    /**
     * Uprawnienia, których nie da się odebrać (deny) ani przypisać/odebrać z
     * roli "admin" bez ryzyka zablokowania panelu dla wszystkich — patrz
     * PermissionRepositoryInterface::countActiveAdmins().
     */
    public const CRITICAL = ['users.create', 'roles.permissions.manage'];

    public static function isValid(string $permission): bool
    {
        return in_array($permission, self::ALL, true);
    }
}
