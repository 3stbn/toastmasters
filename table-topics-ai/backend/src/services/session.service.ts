/** Session defaults and reducers shared by the Durable Object. */
import { DEFAULT_BEHAVIORS } from "../../../shared/phrases";
import { DEFAULT_MOOD } from "../../../shared/moods";
import { DEFAULT_SETTINGS, MAX_ROUND_MINUTES, type SessionState } from "../../../shared/session";

export const SESSION_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O: unambiguous on a projector
export const SESSION_CODE_RE = /^[A-HJ-NP-Z]{4}$/;
export const MAX_TRANSCRIPT_SEGMENTS = 80;
export const MAX_DECISIONS = 40;
/** Idle sessions are wiped after this long. */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const MAX_ROUND_MS = MAX_ROUND_MINUTES * 60 * 1000;
/** Sessions that may be created per UTC day, in total and per client IP (abuse cap, not a real quota). */
export const DAILY_SESSIONS_TOTAL = 150;
export const DAILY_SESSIONS_PER_IP = 20;

export function randomCode(): string {
  let code = "";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  for (const b of bytes) code += SESSION_ALPHABET[b % SESSION_ALPHABET.length];
  return code;
}

export function newSessionState(code: string, now: number): SessionState {
  return {
    code,
    createdAt: now,
    mode: null,
    topic: "",
    topicOptions: [],
    usedTopics: [],
    running: false,
    runningSince: 0,
    settings: { ...DEFAULT_SETTINGS },
    behaviors: DEFAULT_BEHAVIORS.map((b) => ({ ...b, phrases: [...b.phrases] })),
    transcript: [],
    interim: "",
    canvas: { elements: [], page: 1, pending: null, recent: [], cueAt: 0, usedPhotos: [], nextId: 1 },
    subtitles: { current: null, lastShownAt: 0, lastByBehavior: {}, lastPhraseByBehavior: {}, history: [], scores: {} },
    banda: { mood: DEFAULT_MOOD, since: now, trackIndex: 0, scores: {} },
    decisions: [],
    stats: { jevCalls: 0, jevCostUsd: 0, jevErrors: 0, lastError: null },
    clients: { screen: 0, control: 0, mic: 0 },
    screenSound: false,
    screenLoaded: 0,
    soundTestAt: 0,
  };
}

/** Clears live game state but keeps configuration and the phrase bank. */
export function resetLive(state: SessionState, now: number): SessionState {
  const fresh = newSessionState(state.code, now);
  return {
    ...fresh,
    createdAt: state.createdAt,
    mode: state.mode,
    topic: state.topic,
    topicOptions: state.topicOptions,
    usedTopics: state.usedTopics,
    settings: state.settings,
    behaviors: state.behaviors,
    clients: state.clients,
    screenSound: state.screenSound,
    screenLoaded: state.screenLoaded,
    soundTestAt: state.soundTestAt,
    stats: state.stats,
  };
}
