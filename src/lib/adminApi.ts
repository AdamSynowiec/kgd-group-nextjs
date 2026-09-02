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

export type PageSummary = { slug: string; title: string; status: string; updatedAt: string };

export type Session = { token: string; login: string; role: string };

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
  const data = await request<{ token: string; user: { login: string; role: string } }>("/login", {
    method: "POST",
    body: { login: loginName, password },
    session: null,
  });

  return { token: data.token, login: data.user.login, role: data.user.role };
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
