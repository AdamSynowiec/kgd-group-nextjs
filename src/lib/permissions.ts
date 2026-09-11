/**
 * Centralny rejestr operacyjnych uprawnień panelu /admin — mirror
 * backend/src/Support/PermissionRegistry.php (ta sama zasada co
 * src/lib/fieldType.ts <-> backend/src/Support/Editable.php). Kształt
 * "<zasób>.<akcja>", jeden string na REALNIE wymuszaną przez backend
 * operację — nigdy nie tworzony z panelu (w odróżnieniu od ról i ich
 * uprawnień, edytowalnych w sekcji "Uprawnienia").
 *
 * ODRĘBNE od ACL treści strona/pole (src/lib/acl.ts) — te uprawnienia
 * odpowiadają "czy ta operacja jest w ogóle dozwolona", nie "która
 * konkretna strona/pole" (o tym nadal decyduje acl.ts, patrz EditableField.tsx).
 *
 * Backend jest jedynym źródłem prawdy: ta lista tylko odzwierciedla, co
 * panel POKAZUJE/BLOKUJE w UI (can()/<Can>) — każde żądanie i tak jest
 * ponownie sprawdzane po stronie serwera (Authorization::require()).
 */
export const PERMISSIONS = [
  "pages.list",
  "pages.read",
  "pages.create",
  "pages.update",
  "pages.delete",
  "assets.upload",
  "build.trigger",
  "build.status",
  "users.list",
  "users.create",
  "users.delete",
  "roles.list",
  "roles.create",
  "roles.delete",
  "roles.permissions.manage",
  "activity.list",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Mirror PermissionRegistry::FIXED_ADMIN_ONLY (backend) — "build.trigger"/
 * "build.status" wymuszane są na stałe przez SessionAuth::requireRole('admin'),
 * nigdy przez role_permissions (patrz komentarz w admin.php: /build musi
 * działać nawet, gdy baza nie odpowiada). Zaznaczenie ich w gridzie ról nie
 * miałoby więc żadnego efektu — PermissionsPanel.tsx pokazuje je jako
 * zablokowane, a backend i tak odrzuca próbę zapisania (400).
 */
export const FIXED_ADMIN_ONLY: Permission[] = ["build.trigger", "build.status"];

/** "*" (rola "admin") pasuje do każdego uprawnienia — mirror Acl::check()/PermissionRepositoryInterface::effectiveHas() po stronie backendu. */
export function can(permissions: string[] | undefined | null, required: Permission): boolean {
  if (!permissions) return false;
  return permissions.includes(required) || permissions.includes("*");
}
