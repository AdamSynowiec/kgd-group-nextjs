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
    message: string,
    /** Stały identyfikator przypadku z backendu (ApiException $reason), np. "email_verification_required". */
    public readonly reason?: string
  ) {
    super(message);
  }
}

/** Ekran podania i potwierdzenia adresu e-mail — konto bez niego nie dostaje z API nic innego. */
export const EMAIL_VERIFICATION_PATH = "/admin/potwierdz-email/";

/**
 * Backend blokuje konto bez potwierdzonego adresu (AccountController::requireVerifiedEmail()); panel
 * tylko przenosi wtedy na ekran podania adresu — z każdego widoku, bez osobnej obsługi w stronach.
 */
function redirectToEmailVerification(): void {
  if (typeof window === "undefined" || window.location.pathname.startsWith(EMAIL_VERIFICATION_PATH)) return;
  window.location.replace(EMAIL_VERIFICATION_PATH);
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
    const reason: string | undefined = body?.error?.reason;
    if (reason === "email_verification_required") redirectToEmailVerification();
    throw new AdminApiError(response.status, message, reason);
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

export type MeResponse = { login: string | null; role: string | null; permissions: string[]; emailVerificationRequired?: boolean };

/**
 * GET /me — świeże login/rola/efektywne uprawnienia WŁASNEGO konta, bez
 * przelogowania (token sam w sobie się nie odświeża — patrz Authorization.php).
 * "login"/"role" bywają null tylko gdy uwierzytelnianie panelu jest
 * wyłączone (ADMIN_AUTH_ENABLED=false — patrz PermissionsController::me()).
 * Woła się po zmianach w sekcji "Uprawnienia" (PermissionsPanel.tsx), żeby
 * zobaczyć ich efekt natychmiast, nie dopiero po 7 dniach ważności tokenu.
 */
export async function fetchMe(session: Session | null): Promise<MeResponse> {
  const me = await request<MeResponse>("/me", { session });
  if (me.emailVerificationRequired) redirectToEmailVerification();
  return me;
}

export function fetchPages(session: Session | null): Promise<PageSummary[]> {
  return request<PageSummary[]>("/pages", { session });
}

export function fetchPage(slug: string, session: Session | null): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>("/page", { params: { slug }, session });
}

/** lockId = identyfikator blokady edycji (PageLockController) — zapis z cudzą blokadą backend odrzuca (409). */
export function savePage(
  slug: string,
  content: Record<string, unknown>,
  session: Session | null,
  lockId?: string
): Promise<{ saved: boolean }> {
  return request<{ saved: boolean }>("/page", { method: "POST", params: lockId ? { slug, lockId } : { slug }, body: content, session });
}

// --- Blokada edycji stron (jedna osoba naraz) — backend/src/Controller/PageLockController.php ---

export type PageLockHolder = { login: string; acquiredAt: string; heartbeatAt: string; mine: boolean; sameUser: boolean };

/** Losowy identyfikator jednego otwarcia edytora (32 znaki hex). */
export function newLockId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function acquirePageLock(
  slug: string,
  lockId: string,
  session: Session | null,
  force = false
): Promise<{ acquired: boolean; holder: PageLockHolder | null; ttlSeconds: number }> {
  return request<{ acquired: boolean; holder: PageLockHolder | null; ttlSeconds: number }>("/page-lock/acquire", { method: "POST", body: { slug, lockId, force }, session });
}

export function heartbeatPageLock(slug: string, lockId: string, session: Session | null): Promise<{ held: boolean; holder: PageLockHolder | null }> {
  return request<{ held: boolean; holder: PageLockHolder | null }>("/page-lock/heartbeat", { method: "POST", body: { slug, lockId }, session });
}

/**
 * Zwolnienie blokady. keepalive — działa też przy zamykaniu karty (beforeunload/pagehide),
 * kiedy zwykły fetch byłby przerwany. Błędy ignorowane: blokada i tak wygaśnie po TTL.
 */
export function releasePageLock(slug: string, lockId: string, session: Session | null): void {
  const params = new URLSearchParams({ route: "/page-lock/release" });
  void fetch(`${adminBaseUrl()}?${params.toString()}`, {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json", ...authHeader(session) },
    body: JSON.stringify({ slug, lockId }),
  }).catch(() => undefined);
}

export function fetchPageLocks(session: Session | null): Promise<(PageLockHolder & { slug: string })[]> {
  return request<(PageLockHolder & { slug: string })[]>("/page-locks", { session });
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
export async function uploadAsset(file: File, session: Session | null, folderId?: number | null): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  // folderId — katalog biblioteki "Assets", do którego trafia plik (bez niego: najwyższy poziom).
  const params = new URLSearchParams({ route: "/upload", ...(folderId ? { folderId: String(folderId) } : {}) });
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
export type BuildMode = "quick" | "full";

/** mode "quick" (domyślny) = bez wgrywania /blog; "full" = pełna przebudowa i deploy wszystkiego. */
export function triggerBuild(session: Session | null, mode: BuildMode = "quick"): Promise<{ triggered: boolean; dispatchedAt: string }> {
  return request<{ triggered: boolean; dispatchedAt: string }>("/build", { method: "POST", body: { mode }, session });
}

/** Odpytuje status przebiegu uruchomionego przez triggerBuild() — "since" to jego dispatchedAt. */
export function fetchBuildStatus(since: string, session: Session | null): Promise<BuildStatus> {
  return request<BuildStatus>("/build/status", { params: { since }, session });
}

export type UserAccount = { id: number; login: string; email: string | null; role: string; createdAt: string };

/** GET /users — wymaga uprawnienia "users.list" (backend odrzuci resztę 403-ką, patrz UsersController.php). */
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

/**
 * POST /account — zmienia WYŁĄCZNIE własne konto wołającego (nie ma tu "id" —
 * cel jest zawsze zalogowany user, patrz UsersController::updateOwnAccount()).
 * Dostępne dla każdej roli, bez wymogu żadnego uprawnienia — "currentPassword"
 * jest jedynym realnym zabezpieczeniem tej trasy. Tylko hasło — adres e-mail
 * zmienia requestEmailVerification() (potwierdzenie linkiem z maila).
 */
export function updateOwnAccount(
  input: { currentPassword: string; newPassword: string },
  session: Session | null
): Promise<{ login: string; email: string | null; role: string }> {
  return request<{ login: string; email: string | null; role: string }>("/account", {
    method: "POST",
    body: input,
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

export type ActivityEntry = {
  id: number;
  userId: number | null;
  login: string | null;
  action: string;
  target: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
};

/**
 * GET /activity?limit=&offset= — historia aktywności kont, najnowsze
 * najpierw. Wymaga uprawnienia "activity.list" — domyślnie tylko rola
 * "admin" (patrz db/011/db/013, backend/src/Support/PermissionRegistry.php).
 */
export function fetchActivity(
  limit: number,
  offset: number,
  session: Session | null
): Promise<{ items: ActivityEntry[]; total: number }> {
  return request<{ items: ActivityEntry[]; total: number }>("/activity", {
    params: { limit: String(limit), offset: String(offset) },
    session,
  });
}

/** Wynik ostatniego generowania raportu cen inwestycji (status.json w jej katalogu — patrz PriceReportGenerator.php). */
export type PriceReportStatus = {
  key: string;
  name: string;
  sourceSlug: string;
  generatedAt: string;
  result: "ok" | "skipped" | "error" | "disabled";
  message: string;
  datasetUrl: string;
  md5Url: string;
  developer?: string;
  dataDate?: string;
  rows?: number;
  csv?: string;
  csvUrl?: string;
  md5?: string;
  warnings: string[];
};

export type PriceReportInvestment = {
  key: string;
  name: string;
  sourceSlug: string;
  published: boolean;
  /** false = raportowanie wyłączone (np. zakończona inwestycja) — cron i "Generuj wszystkie" ją pomijają. */
  enabled: boolean;
  disabled: { at: string; by: string | null; reason: string } | null;
  datasetUrl: string;
  md5Url: string;
  hasDataset: boolean;
  csvCount: number;
  lastCsv: string | null;
  status: PriceReportStatus | null;
};

export type PriceReportFile = { name: string; type: string; size: number; modifiedAt: string; url: string };

/** GET /price-reports — inwestycje z tabelą historii cen i stan ich katalogów raportów (uprawnienie reports.list). */
export function fetchPriceReports(session: Session | null): Promise<PriceReportInvestment[]> {
  return request<PriceReportInvestment[]>("/price-reports", { session });
}

/** GET /price-reports/files — pliki w katalogu raportu jednej inwestycji. */
export function fetchPriceReportFiles(key: string, session: Session | null): Promise<{ key: string; files: PriceReportFile[]; status: PriceReportStatus | null }> {
  return request<{ key: string; files: PriceReportFile[]; status: PriceReportStatus | null }>("/price-reports/files", { params: { key }, session });
}

/** GET /price-reports/file — treść pliku do podglądu (do 2 MB). */
export function fetchPriceReportFile(
  key: string,
  name: string,
  session: Session | null
): Promise<{ name: string; size: number; url: string; truncated: boolean; content: string }> {
  return request<{ name: string; size: number; url: string; truncated: boolean; content: string }>("/price-reports/file", { params: { key, name }, session });
}

/** POST /price-reports/toggle — włącza/wyłącza raportowanie inwestycji (uprawnienie reports.generate). */
export function togglePriceReport(session: Session | null, key: string, enabled: boolean, reason = ""): Promise<{ key: string; enabled: boolean }> {
  return request<{ key: string; enabled: boolean }>("/price-reports/toggle", { method: "POST", body: { key, enabled, reason }, session });
}

/** Zmiana w rejestrze cen proponowana przez synchronizację z ofertą (PriceRegisterSync.php). */
export type PriceSyncChange = {
  id: string;
  action: "create" | "update" | "remove";
  unit: string;
  fields: { key: string; label: string; from: string; to: string }[];
  note: string | null;
};

export type PriceSyncPlan = {
  offerSlug: string;
  registerSlug: string;
  changes: PriceSyncChange[];
  unchanged: number;
  untouched: string[];
  warnings: string[];
};

/** GET /price-reports/sync — podgląd: co synchronizacja z tabelą lokali zmieni w rejestrze cen (nic nie zapisuje). */
export function fetchPriceSyncPlan(session: Session | null, key: string): Promise<PriceSyncPlan> {
  return request<PriceSyncPlan>("/price-reports/sync", { params: { key }, session });
}

/** POST /price-reports/sync — zapisuje w rejestrze wybrane zmiany z podglądu (uprawnienie reports.generate). */
export function applyPriceSync(
  session: Session | null,
  key: string,
  ids: string[]
): Promise<{ applied: number; created: number; updated: number; removed: number; units: string[] }> {
  return request<{ applied: number; created: number; updated: number; removed: number; units: string[] }>("/price-reports/sync", { method: "POST", body: { key, ids }, session });
}

/** POST /price-reports/generate — jedna inwestycja (key) albo wszystkie (bez key); uprawnienie reports.generate. */
export function generatePriceReports(session: Session | null, key?: string): Promise<PriceReportStatus[]> {
  return request<PriceReportStatus[]>("/price-reports/generate", { method: "POST", body: key ? { key } : {}, session });
}

// --- Assets: biblioteka wgranych plików — backend/src/Controller/AssetController.php ---

export type AssetFolder = { id: number; parentId: number | null; name: string; count: number };
export type AssetItem = {
  id: number;
  filename: string;
  url: string;
  name: string;
  folderId: number | null;
  mime: string | null;
  size: number;
  width: number | null;
  height: number | null;
  uploadedBy: string | null;
  createdAt: string;
};

/** Katalogi (całe drzewo) + pliki katalogu (null = najwyższy poziom) albo wyniki wyszukiwania (q — we wszystkich). */
export function fetchAssets(folderId: number | null, query: string, session: Session | null): Promise<{ folders: AssetFolder[]; folderId: number | null; assets: AssetItem[] }> {
  return request("/assets", { params: { folder: folderId ? String(folderId) : "root", ...(query ? { q: query } : {}) }, session });
}

export function createAssetFolder(name: string, parentId: number | null, session: Session | null): Promise<{ id: number; folders: AssetFolder[] }> {
  return request("/assets/folders", { method: "POST", body: { name, parentId }, session });
}

/** Zmiana nazwy i/lub przeniesienie katalogu (parentId: null = najwyższy poziom). */
export function updateAssetFolder(id: number, change: { name?: string; parentId?: number | null }, session: Session | null): Promise<{ folders: AssetFolder[] }> {
  return request("/assets/folders/update", { method: "POST", body: { id, ...change }, session });
}

/** Pliki i podkatalogi usuwanego katalogu przechodzą piętro wyżej — z dysku nic nie znika. */
export function deleteAssetFolder(id: number, session: Session | null): Promise<{ folders: AssetFolder[] }> {
  return request("/assets/folders", { method: "DELETE", params: { id: String(id) }, session });
}

export function moveAssets(ids: number[], folderId: number | null, session: Session | null): Promise<{ moved: number }> {
  return request("/assets/update", { method: "POST", body: { ids, folderId }, session });
}

export function renameAsset(id: number, name: string, session: Session | null): Promise<AssetItem> {
  return request("/assets/update", { method: "POST", body: { id, name }, session });
}

export function fetchAssetUsage(id: number, session: Session | null): Promise<{ pages: string[] }> {
  return request("/assets/usage", { params: { id: String(id) }, session });
}

/** Bez force backend odmawia (409), gdy plik jest używany na stronie. */
export function deleteAsset(id: number, force: boolean, session: Session | null): Promise<{ deleted: boolean }> {
  return request("/assets", { method: "DELETE", params: { id: String(id), ...(force ? { force: "1" } : {}) }, session });
}

// --- Tokeny REST API v1 — backend/src/Controller/ApiTokenController.php ---

export type ApiTokenRecord = {
  id: number;
  name: string;
  /** Pierwsze znaki tokenu — do rozpoznania na liście (pełny token jest znany tylko przy utworzeniu). */
  prefix: string;
  scopes: string[];
  createdBy: string | null;
  createdAt: string | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export function fetchApiTokens(session: Session | null): Promise<{ tokens: ApiTokenRecord[]; scopes: Record<string, string> }> {
  return request("/api-tokens", { session });
}

/** Zwraca pełny token — jedyny raz, kiedy jest dostępny. */
export function createApiToken(
  input: { name: string; scopes: string[]; expiresInDays: number | null },
  session: Session | null
): Promise<{ token: string; record: ApiTokenRecord }> {
  return request("/api-tokens", { method: "POST", body: input, session });
}

export function revokeApiToken(id: number, session: Session | null): Promise<ApiTokenRecord> {
  return request("/api-tokens/revoke", { method: "POST", body: { id }, session });
}

/** Brakujący identyfikator / typ strony w REST API v1 (null = już nadany, bez zmian). */
export type PageIdentityChange = { slug: string; apiKey: string | null; apiType: string | null };

/** Podgląd: co dostałyby strony bez identyfikatora lub typu (nic nie zapisuje). */
export function fetchPageIdentityChanges(session: Session | null): Promise<{ changes: PageIdentityChange[] }> {
  return request("/page-identity", { session });
}

/** Nadaje brakujące identyfikatory i typy stron (już nadanych nie zmienia). */
export function assignPageIdentity(session: Session | null): Promise<{ changes: PageIdentityChange[] }> {
  return request("/page-identity", { method: "POST", body: {}, session });
}

// --- Pliki serwisu (robots.txt, …) — backend/src/Controller/SiteFileController.php ---

/** content: null = plik domyślny (src/lib/siteFiles.ts), bez własnej treści w bazie. */
export type SiteFileRecord = { name: string; content: string | null; updatedBy: string | null; updatedAt: string | null };

export function fetchSiteFiles(session: Session | null): Promise<{ files: SiteFileRecord[] }> {
  return request("/site-files", { session });
}

/** Pusta treść przywraca plik domyślny. */
export function saveSiteFile(name: string, content: string, session: Session | null): Promise<SiteFileRecord> {
  return request("/site-files", { method: "POST", body: { name, content }, session });
}

// --- Adres e-mail konta i reset hasła — backend/src/Controller/AccountController.php ---

/** required: panel jest zablokowany, dopóki adres nie zostanie potwierdzony linkiem z maila. */
export type AccountEmailStatus = { login: string; email: string | null; emailVerified: boolean; pendingEmail: string | null; required: boolean };

export function fetchAccountEmail(session: Session | null): Promise<AccountEmailStatus> {
  return request("/account/email", { session });
}

/** Wysyła link potwierdzający na podany adres; obecny (jeśli jest) działa do czasu potwierdzenia nowego. */
export function requestEmailVerification(input: { email: string; currentPassword: string }, session: Session | null): Promise<AccountEmailStatus> {
  return request("/account/email", { method: "POST", body: input, session });
}

/** Link z maila (?token=) — działa bez zalogowania. */
export function verifyEmail(token: string): Promise<{ email: string }> {
  return request("/account/email/verify", { method: "POST", body: { token }, session: null });
}

/** Login albo e-mail; odpowiedź zawsze ta sama, niezależnie od tego, czy konto istnieje. */
export function forgotPassword(login: string): Promise<{ sent: boolean }> {
  return request("/password/forgot", { method: "POST", body: { login }, session: null });
}

export function resetPassword(token: string, password: string): Promise<{ reset: boolean }> {
  return request("/password/reset", { method: "POST", body: { token, password }, session: null });
}
