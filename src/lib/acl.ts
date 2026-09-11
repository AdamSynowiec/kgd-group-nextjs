/**
 * ACL (kto z jaką rolą widzi/edytuje) — dla stron (Page.acl, najwyższy
 * poziom JSON-a, obok "slug"/"title"/"sections") i dla pojedynczych pól
 * (EditableValue.acl, patrz src/lib/editable.ts). Mirror po stronie PHP:
 * backend/src/Support/Acl.php — obie strony muszą liczyć dostęp identycznie,
 * ale backend jest jedynym realnym źródłem prawdy (patrz EditableMerge.php);
 * to tutaj tylko decyduje, co panel POKAZUJE, nie co wolno zmienić.
 *
 * Reguła: brak "acl" -> widoczne/edytowalne wyłącznie dla roli "admin".
 * Rola "admin" zawsze przechodzi każdy check, niezależnie od "acl". Gdy
 * `role` jest `null`/`undefined` (sesja wyłączona/nieznana — patrz
 * SessionAuth::guard w PHP, gdzie ADMIN_AUTH_ENABLED=false daje `session: null`),
 * każdy check też przechodzi — ten sam tryb "dev bez logowania" co reszta panelu.
 */

export type AclPermission = "read" | "write" | "read/write";

export type Acl = { role: string; permission: AclPermission };

function permissionAllows(permission: AclPermission, need: "read" | "write"): boolean {
  return permission === need || permission === "read/write";
}

function check(acl: Acl | null | undefined, role: string | null | undefined, need: "read" | "write"): boolean {
  if (role === null || role === undefined) return true;
  if (role === "admin") return true;
  if (!acl) return false;
  return acl.role === role && permissionAllows(acl.permission, need);
}

export function canRead(acl: Acl | null | undefined, role: string | null | undefined): boolean {
  return check(acl, role, "read");
}

export function canWrite(acl: Acl | null | undefined, role: string | null | undefined): boolean {
  return check(acl, role, "write");
}
