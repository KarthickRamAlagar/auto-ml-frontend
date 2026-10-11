import type { ServerEvent } from "./types";

/** Same origin by default: the Worker serves the app and /api, so cookies just work. Set VITE_API_URL only for a separate host. */
export const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) || "").replace(/\/$/, "");

let onSessionEnded: () => void = () => {};
export const setSessionEndedHandler = (fn: () => void) => {
  onSessionEnded = fn;
};

/** One refresh at a time, shared by every request that finds the access cookie expired. */
let refreshing: Promise<boolean> | null = null;
export function refreshSession(): Promise<boolean> {
  refreshing ??= fetch(`${API_BASE}/api/auth/refresh`, { method: "POST", credentials: "include" })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      setTimeout(() => (refreshing = null), 0);
    });
  return refreshing;
}

export class ApiError extends Error {
  status: number;
  detail: unknown;
  resetsAt?: number;
  code?: string;
  constructor(status: number, detail: unknown) {
    const d = detail as { message?: string; resets_at?: number; code?: string } | string | undefined;
    const message =
      typeof d === "string" ? d : Array.isArray(detail) ? "Please check the highlighted fields." : d?.message || `Request failed (${status})`;
    super(message);
    this.status = status;
    this.detail = detail;
    if (d && typeof d === "object" && !Array.isArray(d)) {
      this.resetsAt = d.resets_at;
      this.code = d.code;
    }
  }
}

const isAuthPath = (p: string) => p.startsWith("/api/auth/");

async function request<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: "include" });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }
  if (res.status === 401 && !retried && !isAuthPath(path)) {
    if (await refreshSession()) return request<T>(path, init, true);
    onSessionEnded();
  }
  if (!res.ok) {
    let detail: unknown = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* keep statusText */
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<T>(path, { method: "POST", body: fd });
  },
};

/** Stream job events (Server-Sent Events over fetch with the session cookie). Reconnects with `from`. */
export async function streamJob(jobId: string, onEvent: (ev: ServerEvent) => void, signal: AbortSignal): Promise<void> {
  let next = 0;
  let attempts = 0;
  for (;;) {
    try {
      let res = await fetch(`${API_BASE}/api/jobs/${jobId}/events?from=${next}`, { credentials: "include", signal });
      if (res.status === 401 && (await refreshSession())) {
        res = await fetch(`${API_BASE}/api/jobs/${jobId}/events?from=${next}`, { credentials: "include", signal });
      }
      if (!res.ok || !res.body) throw new ApiError(res.status, res.statusText);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const chunk = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const line = chunk.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const ev = JSON.parse(line.slice(6)) as ServerEvent & { seq?: number };
          if (typeof ev.seq === "number") next = ev.seq + 1;
          onEvent(ev);
          if (ev.type === "job_end") return;
        }
      }
      if (attempts++ > 4) return;
    } catch (err) {
      if (signal.aborted) return;
      if (err instanceof ApiError && err.status === 404) throw err;
      if (attempts++ > 4) throw err;
      await new Promise((r) => setTimeout(r, 1200));
    }
  }
}
