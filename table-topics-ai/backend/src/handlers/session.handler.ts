/** Thin proxies to the session Durable Object. */
import type { ClientAction, ConfigPatch } from "../../../shared/protocol";
import { clientId } from "../durable/quota.do";
import { SESSION_CODE_RE, randomCode } from "../services/session.service";
import { NotFoundError, InternalServerError, BadRequestError, TooManyRequestsError } from "../utils/errors";

function stub(env: Cloudflare.Env, code: string): DurableObjectStub {
  return env.SESSIONS.get(env.SESSIONS.idFromName(code.toUpperCase()));
}

export function normalizeCode(code: string): string {
  const up = code.toUpperCase();
  if (!SESSION_CODE_RE.test(up)) throw new BadRequestError("Código de sesión inválido");
  return up;
}

async function call<T>(env: Cloudflare.Env, code: string, path: string, init?: RequestInit): Promise<T> {
  const res = await stub(env, code).fetch(`https://session${path}`, init);
  if (res.status === 404) throw new NotFoundError("Sesión no encontrada");
  if (!res.ok) throw new InternalServerError(`Session DO ${res.status}`);
  return (await res.json()) as T;
}

/** `ip` is the caller's address (cf-connecting-ip); the daily quota counts per hashed ip and in total. */
export async function createSession(env: Cloudflare.Env, ip: string): Promise<{ code: string }> {
  const quota = await env.QUOTA.get(env.QUOTA.idFromName("daily")).take(await clientId(ip || "unknown"));
  if (!quota.ok) {
    throw new TooManyRequestsError(
      quota.reason === "client"
        ? "Hoy ya se han creado demasiadas sesiones desde este dispositivo. Vuelve mañana."
        : "Hoy ya se han creado todas las sesiones disponibles. Vuelve mañana.",
    );
  }
  for (let i = 0; i < 8; i++) {
    const code = randomCode();
    const res = await stub(env, code).fetch(`https://session/create?code=${code}`, { method: "POST" });
    if (res.ok) return { code };
  }
  throw new InternalServerError("No se pudo generar un código de sesión");
}

export function getSession(env: Cloudflare.Env, code: string) {
  return call<Record<string, unknown>>(env, code, "/state");
}

export function patchSession(env: Cloudflare.Env, code: string, patch: ConfigPatch) {
  return call<Record<string, unknown>>(env, code, "/config", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export function postTranscript(env: Cloudflare.Env, code: string, body: { text: string; final: boolean }) {
  return call<{ ok: true }>(env, code, "/transcript", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function postAction(env: Cloudflare.Env, code: string, action: ClientAction) {
  return call<Record<string, unknown>>(env, code, "/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });
}

export function evaluateNow(env: Cloudflare.Env, code: string) {
  return call<Record<string, unknown>>(env, code, "/evaluate", { method: "POST" });
}

export function websocket(env: Cloudflare.Env, code: string, request: Request): Promise<Response> {
  const role = new URL(request.url).searchParams.get("role") ?? "screen";
  return stub(env, code).fetch(`https://session/ws?role=${role}`, request);
}
