/**
 * Game engines are pure: given the session state and a clock they build the
 * Jev questions, and given Jev's answers they return a new state plus a
 * human-readable outcome. The Durable Object owns I/O; the eval script reuses
 * the same functions against scripted transcripts.
 */
import type { SessionState } from "../../../../shared/session";
import type { JevAnswer, JevQuestion, JevState } from "../jev.service";

export interface JevRequest {
  state: JevState;
  questions: Record<string, JevQuestion>;
  /** The text Jev is judging, for the decision log. */
  input: string;
}

export interface ApplyResult {
  state: SessionState;
  outcome: string;
}

export interface GameEngine {
  /** Null when there is nothing worth asking (e.g. too little transcript). */
  buildRequest(state: SessionState, now: number): JevRequest | null;
  apply(state: SessionState, answers: Record<string, JevAnswer>, now: number): ApplyResult;
  /** Time-based step with no Jev call (alarms). Returns null when nothing changed. */
  tick?(state: SessionState, now: number): ApplyResult | null;
  /** When the next tick should run, or null. */
  nextTickAt?(state: SessionState, now: number): number | null;
}

/**
 * Last `seconds` of final transcript plus whatever the recogniser is still
 * transcribing (interim), joined. The interim part is what makes reactions
 * feel live: we do not wait for the recogniser to close the sentence.
 */
export function recentTranscript(state: SessionState, now: number, seconds: number, maxSegments = 6): string {
  const cutoff = now - seconds * 1000;
  const recent = state.transcript.filter((s) => s.at >= cutoff).slice(-maxSegments);
  return [...recent.map((s) => s.text), state.interim].join(" ").replace(/\s+/g, " ").trim();
}

/** Transcript before the recent window (older context), capped in length. */
export function earlierTranscript(state: SessionState, now: number, recentSeconds: number, maxChars = 900): string {
  const cutoff = now - recentSeconds * 1000;
  const earlier = state.transcript.filter((s) => s.at < cutoff).map((s) => s.text).join(" ");
  return earlier.length > maxChars ? "…" + earlier.slice(-maxChars) : earlier;
}

export function pickRandom<T>(items: T[], avoid?: T): T {
  if (items.length === 0) throw new Error("pickRandom: empty");
  if (items.length === 1) return items[0];
  let pick = items[Math.floor(Math.random() * items.length)];
  while (pick === avoid) pick = items[Math.floor(Math.random() * items.length)];
  return pick;
}
