/**
 * Klient API panelu admina — działa w przeglądarce, w czasie rzeczywistym
 * (w odróżnieniu od src/lib/content.ts, które czyta dane w czasie builda).
 * Dogaduje się z backend/admin.php: ta sama konwencja ?route=, ten sam
 * kształt odpowiedzi {"data": ...} / {"error": ...} co publiczne API.
 */

export type PageSummary = { slug: string; title: string; status: string; updatedAt: string };

export type Credentials = { username: string; password: string };

const CREDENTIALS_KEY = "kgd-admin-credentials";

export function loadCredentials(): Credentials | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CREDENTIALS_KEY);
    return raw ? (JSON.parse(raw) as Credentials) : null;
  } catch {
    return null;
  }
}

export function storeCredentials(credentials: Credentials | null): void {
  if (typeof window === "undefined") return;
  if (credentials) {
    window.sessionStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
  } else {
    window.sessionStorage.removeItem(CREDENTIALS_KEY);
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
 * i statyczna strona żyją pod tą samą domeną (patrz architektura /api/*
 * ustalona wcześniej w projekcie). NEXT_PUBLIC_API_BASE_URL nadpisuje to
 * tylko wtedy, gdy backend faktycznie jest gdzie indziej (np. dev lokalny).
 */
function adminBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_API_BASE_URL;
  const base = (explicit || "/api").replace(/\/+$/, "");
  return `${base}/admin.php`;
}

function authHeader(credentials: Credentials | null): Record<string, string> {
  if (!credentials) return {};
  const token = typeof window !== "undefined" ? window.btoa(`${credentials.username}:${credentials.password}`) : "";
  return token ? { Authorization: `Basic ${token}` } : {};
}

async function request<T>(
  route: string,
  options: { method?: string; slug?: string; body?: unknown; credentials: Credentials | null }
): Promise<T> {
  const params = new URLSearchParams({ route });
  if (options.slug) params.set("slug", options.slug);

  const response = await fetch(`${adminBaseUrl()}?${params.toString()}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(options.credentials),
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

export function fetchPages(credentials: Credentials | null): Promise<PageSummary[]> {
  return request<PageSummary[]>("/pages", { credentials });
}

export function fetchPage(slug: string, credentials: Credentials | null): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>("/page", { slug, credentials });
}

export function savePage(
  slug: string,
  content: Record<string, unknown>,
  credentials: Credentials | null
): Promise<{ saved: boolean }> {
  return request<{ saved: boolean }>("/page", { method: "POST", slug, body: content, credentials });
}

/** Odpala GitHub Actions (workflow_dispatch) przez backend — token GitHuba nigdy nie trafia do przeglądarki. */
export function triggerBuild(credentials: Credentials | null): Promise<{ triggered: boolean }> {
  return request<{ triggered: boolean }>("/build", { method: "POST", credentials });
}
