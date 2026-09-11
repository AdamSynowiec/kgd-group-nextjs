/**
 * Klient API panelu — działa w przeglądarce, w czasie rzeczywistym
 * (w odróżnieniu od src/lib/content.ts, które czyta dane w czasie builda).
 * Dogaduje się z backend/admin.php: ta sama konwencja ?route=, ten sam
 * kształt odpowiedzi {"data": ...} / {"error": ...} co publiczne API.
 *
 * Uwierzytelnianie: token sesji (nagłówek "Authorization: Bearer <token>"),
 * nie HTTP Basic Auth — schemat Bearer nie jest rozpoznawany przez
 * przeglądarki jako interaktywny, więc nie ryzykujemy natywnego okienka
 * logowania nad własnym UI panelu (patrz backend/src/Http/SessionAuth.php).
 */

export type PageSummary = { slug: string; title: string; status: string; parent: string | null; updatedAt: string };

/**
 * "permissions" — efektywne uprawnienia operacyjne (patrz src/lib/permissions.ts,
 * can()/<Can>) w chwili logowania/ostatniego fetchMe(). "role" zostaje tu
 * tylko do wyświetlenia (np. Topbar.tsx) — backend NIGDY nie ufa roli z
 * tokenu przy autoryzacji (patrz backend/src/Support/Authorization.php),
 * więc frontend też nie powinien jej używać do decyzji o dostępie — zawsze
 * przez "permissions".
 */
export type Session = { token: string; login: string; role: string; permissions: string[] };

const SESSION_KEY = "admin-session";

export function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function storeSession(session: Session | null): void {
  if (typeof window === "undefined") return;
  if (session) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(SESSION_KEY);
  }
}

export class AdminApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

/**
 * Domyślnie względna ścieżka "/api" — działa automatycznie, bo backend
 * i statyczna strona żyją pod tą samą domeną. NEXT_PUBLIC_API_BASE_URL
 * nadpisuje to tylko wtedy, gdy backend faktycznie jest gdzie indziej
 * (np. dev lokalny, albo inny projekt korzystający z tego samego panelu).
 */
function adminBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_API_BASE_URL;
  const base = (explicit || "/api").replace(/\/+$/, "");
  return `${base}/admin.php`;
}

function authHeader(session: Session | null): Record<string, string> {
  return session ? { Authorization: `Bearer ${session.token}` } : {};
}

async function request<T>(
  route: string,
  options: { method?: string; params?: Record<string, string>; body?: unknown; session: Session | null }
): Promise<T> {
  const params = new URLSearchParams({ route, ...(options.params ?? {}) });

  const response = await fetch(`${adminBaseUrl()}?${params.toString()}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(options.session),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = (body && body.error && body.error.message) || `Błąd ${response.status}`;
    throw new AdminApiError(response.status, message);
  }

  return body.data as T;
}

/** POST /login — weryfikuje dane i wystawia token sesji. Backend jest jedynym źródłem prawdy o tym, czy dane są poprawne. */
export async function login(loginName: string, password: string): Promise<Session> {
  const data = await request<{ token: string; user: { login: string; role: string; permissions: string[] } }>("/login", {
    method: "POST",
    body: { login: loginName, password },
    session: null,
  });

  return { token: data.token, login: data.user.login, role: data.user.role, permissions: data.user.permissions };
}

export type MeResponse = { login: string | null; role: string | null; permissions: string[] };

/**
 * GET /me — świeże login/rola/efektywne uprawnienia WŁASNEGO konta, bez
 * przelogowania (token sam w sobie się nie odświeża — patrz Authorization.php).
 * "login"/"role" bywają null tylko gdy uwierzytelnianie panelu jest
 * wyłączone (ADMIN_AUTH_ENABLED=false — patrz PermissionsController::me()).
 * Woła się po zmianach w sekcji "Uprawnienia" (PermissionsPanel.tsx), żeby
 * zobaczyć ich efekt natychmiast, nie dopiero po 7 dniach ważności tokenu.
 */
export function fetchMe(session: Session | null): Promise<MeResponse> {
  return request<MeResponse>("/me", { session });
}

export function fetchPages(session: Session | null): Promise<PageSummary[]> {
  return request<PageSummary[]>("/pages", { session });
}

export function fetchPage(slug: string, session: Session | null): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>("/page", { params: { slug }, session });
}

export function savePage(
  slug: string,
  content: Record<string, unknown>,
  session: Session | null
): Promise<{ saved: boolean }> {
  return request<{ saved: boolean }>("/page", { method: "POST", params: { slug }, body: content, session });
}

/** POST /pages, body: {"slug": "/blog/moj-wpis", "content": {...}} — patrz src/lib/pageTemplates.ts dla treści startowej. */
export function createPage(
  slug: string,
  content: Record<string, unknown>,
  session: Session | null
): Promise<{ slug: string; content: Record<string, unknown>; updatedAt: string }> {
  return request("/pages", { method: "POST", body: { slug, content }, session });
}

export function deletePage(slug: string, session: Session | null): Promise<{ deleted: boolean; slug: string }> {
  return request("/page", { method: "DELETE", params: { slug }, session });
}

/**
 * Pola typu "asset" w EditableField.tsx — wysyła plik jako multipart/form-data
 * (nie JSON, w odróżnieniu od reszty tego klienta) i dostaje z powrotem URL
 * względny od korzenia domeny (np. "/api/uploads/abc123.webp"), gotowy do
 * zapisania wprost w polu "value" tak samo jak wklejony ręcznie tekst.
 */
export async function uploadAsset(file: File, session: Session | null): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const params = new URLSearchParams({ route: "/upload" });
  const response = await fetch(`${adminBaseUrl()}?${params.toString()}`, {
    method: "POST",
    headers: authHeader(session),
    body: formData,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = (body && body.error && body.error.message) || `Błąd ${response.status}`;
    throw new AdminApiError(response.status, message);
  }

  return (body.data as { url: string }).url;
}

export type BuildStatus = {
  status: "pending" | "queued" | "in_progress" | "completed" | string;
  conclusion: "success" | "failure" | "cancelled" | "timed_out" | string | null;
  htmlUrl: string | null;
  runNumber: number | null;
};

/** Odpala GitHub Actions (workflow_dispatch) przez backend — token GitHuba nigdy nie trafia do przeglądarki. */
export function triggerBuild(session: Session | null): Promise<{ triggered: boolean; dispatchedAt: string }> {
  return request<{ triggered: boolean; dispatchedAt: string }>("/build", { method: "POST", session });
}

/** Odpytuje status przebiegu uruchomionego przez triggerBuild() — "since" to jego dispatchedAt. */
export function fetchBuildStatus(since: string, session: Session | null): Promise<BuildStatus> {
  return request<BuildStatus>("/build/status", { params: { since }, session });
}

export type UserAccount = { id: number; login: string; role: string; createdAt: string };

/** GET /users — tylko rola "admin" (backend odrzuci innych 403-ką, patrz UsersController.php). */
export function fetchUsers(session: Session | null): Promise<UserAccount[]> {
  return request<UserAccount[]>("/users", { session });
}

export function createUser(
  input: { login: string; password: string; role: string },
  session: Session | null
): Promise<{ id: number; login: string; role: string }> {
  return request<{ id: number; login: string; role: string }>("/users", { method: "POST", body: input, session });
}

export function deleteUser(id: number, session: Session | null): Promise<{ deleted: boolean; id: number }> {
  return request<{ deleted: boolean; id: number }>("/users", {
    method: "DELETE",
    params: { id: String(id) },
    session,
  });
}

export type RoleAccount = { name: string; label: string; createdAt: string };

/** GET /roles — tylko rola "admin" (patrz RolesController.php). Role dostępne do przypisania kontom i do ACL (src/lib/acl.ts). */
export function fetchRoles(session: Session | null): Promise<RoleAccount[]> {
  return request<RoleAccount[]>("/roles", { session });
}

/** "name" (nazwa techniczna) jest niezmienna po utworzeniu — brak endpointu do jej edycji, patrz RolesController::createRole(). */
export function createRole(
  input: { name: string; label: string },
  session: Session | null
): Promise<{ name: string; label: string }> {
  return request<{ name: string; label: string }>("/roles", { method: "POST", body: input, session });
}

export function deleteRole(name: string, session: Session | null): Promise<{ deleted: boolean; name: string }> {
  return request<{ deleted: boolean; name: string }>("/roles", {
    method: "DELETE",
    params: { name },
    session,
  });
}

export type RolePermissionsMap = { roles: RoleAccount[]; grants: Record<string, string[]> };

/** GET /roles/permissions — mapowanie WSZYSTKICH ról naraz, pod grid w PermissionsPanel.tsx. Wymaga "roles.permissions.manage". */
export function fetchRolePermissions(session: Session | null): Promise<RolePermissionsMap> {
  return request<RolePermissionsMap>("/roles/permissions", { session });
}

/** POST /roles/permissions — nadpisuje CAŁY zestaw uprawnień jednej roli na raz (checkbox-grid wysyła pełny stan). Rola "admin" jest odrzucana przez backend (ma zawsze "*"). */
export function updateRolePermissions(
  role: string,
  permissions: string[],
  session: Session | null
): Promise<{ role: string; permissions: string[] }> {
  return request<{ role: string; permissions: string[] }>("/roles/permissions", {
    method: "POST",
    body: { role, permissions },
    session,
  });
}

export type UserPermissions = { userId: number; role: string; granted: string[]; denied: string[]; effective: string[] };

/** GET /users/permissions?id= — efektywne uprawnienia jednego konta, z rozbiciem na źródło (rola / odebrane). */
export function fetchUserPermissions(userId: number, session: Session | null): Promise<UserPermissions> {
  return request<UserPermissions>("/users/permissions", { params: { id: String(userId) }, session });
}

/** POST /users/permissions/deny?id= — odbiera JEDNO uprawnienie temu userowi mimo jego roli. Bez odpowiednika "allow" — patrz src/lib/permissions.ts. */
export function denyUserPermission(
  userId: number,
  permission: string,
  session: Session | null
): Promise<{ denied: boolean; userId: number; permission: string }> {
  return request<{ denied: boolean; userId: number; permission: string }>("/users/permissions/deny", {
    method: "POST",
    params: { id: String(userId) },
    body: { permission },
    session,
  });
}

/** DELETE /users/permissions/deny?id=&permission= — przywraca dostęp wynikający z roli (usuwa deny). */
export function undenyUserPermission(
  userId: number,
  permission: string,
  session: Session | null
): Promise<{ restored: boolean; userId: number; permission: string }> {
  return request<{ restored: boolean; userId: number; permission: string }>("/users/permissions/deny", {
    method: "DELETE",
    params: { id: String(userId), permission },
    session,
  });
}
