/**
 * Singleton Durable Object (id from the name "daily") that counts the sessions
 * created today, in total and per client, so a script or a forgotten tab
 * cannot run up the engine bill. Everything lives in one storage key that is
 * reset when the UTC day changes; clients are stored as truncated hashes,
 * never as raw IPs.
 */
import { DurableObject } from "cloudflare:workers";
import { DAILY_SESSIONS_PER_IP, DAILY_SESSIONS_TOTAL } from "../services/session.service";

const KEY = "day";

interface Day {
  date: string;
  total: number;
  clients: Record<string, number>;
}

export type QuotaResult = { ok: true } | { ok: false; reason: "client" | "total" };

export class QuotaDO extends DurableObject<Cloudflare.Env> {
  /** Reserve one session for `client` (an opaque hash). Counts even when refused, which is fine. */
  async take(client: string): Promise<QuotaResult> {
    const date = new Date().toISOString().slice(0, 10);
    let day = await this.ctx.storage.get<Day>(KEY);
    if (!day || day.date !== date) day = { date, total: 0, clients: {} };
    if (day.total >= DAILY_SESSIONS_TOTAL) return { ok: false, reason: "total" };
    const mine = day.clients[client] ?? 0;
    if (mine >= DAILY_SESSIONS_PER_IP) return { ok: false, reason: "client" };
    day.total++;
    day.clients[client] = mine + 1;
    await this.ctx.storage.put(KEY, day);
    return { ok: true };
  }

  async status(): Promise<Day> {
    const date = new Date().toISOString().slice(0, 10);
    const day = await this.ctx.storage.get<Day>(KEY);
    return day && day.date === date ? day : { date, total: 0, clients: {} };
  }
}

/** Short, non-reversible id for a client IP (the quota needs equality, not the address). */
export async function clientId(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(digest).slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
}
