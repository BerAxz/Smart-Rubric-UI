import type { components } from "./generated";

export type ApiErrorBody = components["schemas"]["ErrorBody"];

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
}

export interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: components["schemas"]["UserRead"];
}

const STORAGE_KEY = "smart-rubric.auth";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

export const authStorage = {
  read(): StoredAuth | null {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const value = JSON.parse(raw) as StoredAuth;
      if (!value.accessToken || !value.refreshToken || !value.user) return null;
      return value;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  },
  write(value: StoredAuth) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  },
  clear() {
    window.localStorage.removeItem(STORAGE_KEY);
  },
};

export { API_BASE_URL };

interface RequestOptions {
  auth?: boolean;
  retryOnUnauthorized?: boolean;
}

function emitSessionExpired() {
  authStorage.clear();
  window.dispatchEvent(new CustomEvent("smart-rubric:session-expired"));
}

async function parseError(response: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  const errorBody: ApiErrorBody =
    typeof body === "object" && body !== null && "error" in body
      ? ((body as { error: ApiErrorBody }).error ?? { code: "http_error", message: response.statusText })
      : { code: "http_error", message: response.statusText || "La solicitud no pudo completarse." };

  return new ApiError(response.status, errorBody);
}

async function refreshAccessToken(): Promise<StoredAuth | null> {
  const current = authStorage.read();
  if (!current?.refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: current.refreshToken }),
    });
    if (!response.ok) {
      emitSessionExpired();
      return null;
    }
    const tokens = (await response.json()) as components["schemas"]["TokenResponse"];
    const next = { ...current, accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresIn: tokens.expires_in };
    authStorage.write(next);
    return next;
  } catch {
    emitSessionExpired();
    return null;
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: RequestOptions = {},
): Promise<T> {
  const useAuth = options.auth ?? true;
  const headers = new Headers(init.headers);
  if (
    init.body &&
    !headers.has("Content-Type") &&
    !(typeof FormData !== "undefined" && init.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }
  if (useAuth) {
    const auth = authStorage.read();
    if (auth?.accessToken) headers.set("Authorization", `Bearer ${auth.accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (response.status === 401 && useAuth && (options.retryOnUnauthorized ?? true) && path !== "/api/v1/auth/refresh") {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiRequest<T>(path, init, { ...options, retryOnUnauthorized: false });
    throw new ApiError(401, { code: "session_expired", message: "Tu sesión ha vencido. Inicia sesión nuevamente." });
  }
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
