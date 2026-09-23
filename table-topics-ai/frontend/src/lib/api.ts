import type { ClientAction, ConfigPatch } from "@shared/protocol";
import type { SessionState } from "@shared/session";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      message = ((await res.json()) as { message?: string }).message ?? message;
    } catch {
      /* not json */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

const headers = { "Content-Type": "application/json" };

export const api = {
  createSession: () => fetch("/api/sessions", { method: "POST" }).then((r) => json<{ code: string }>(r)),
  getSession: (code: string) => fetch(`/api/sessions/${code}`).then((r) => json<SessionState>(r)),
  patchSession: (code: string, patch: ConfigPatch) =>
    fetch(`/api/sessions/${code}`, { method: "PATCH", headers, body: JSON.stringify(patch) }).then((r) => json<SessionState>(r)),
  action: (code: string, action: ClientAction) =>
    fetch(`/api/sessions/${code}/action`, { method: "POST", headers, body: JSON.stringify(action) }).then((r) => json<SessionState>(r)),
};

export function sessionUrl(code: string, page: "" | "screen" | "mic" | "control"): string {
  return `${location.origin}/s/${code}${page ? `/${page}` : ""}`;
}

export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
}
