/**
 * "Subtítulos de la verdad": one noul per behaviour in the (editable) phrase
 * bank, evaluated continuously over the recent transcript (interim included).
 * Fully automatic: a subtitle shows instantly when a behaviour clears its
 * threshold, and if nothing has for subtitleMaxSilenceSeconds the most
 * likely behaviour above a low floor is shown anyway, so the screen never
 * goes quiet. Global gap and per-behaviour cooldown keep it from nagging.
 * Smoothed scores feed the on-screen meter.
 */
import type { SessionState } from "../../../../shared/session";
import type { Behavior } from "../../../../shared/phrases";
import type { JevQuestion, NoulAnswer } from "../jev.service";
import { type ApplyResult, type GameEngine, type JevRequest, earlierTranscript, pickRandom, recentTranscript } from "./types";

const RECENT_SECONDS = 12;
const HISTORY = 6;
const EMA_ALPHA = 0.45;

export function subtitleQuestions(behaviors: Behavior[]): Record<string, JevQuestion> {
  const questions: Record<string, JevQuestion> = {};
  for (const b of behaviors) {
    questions[b.id] = { type: "noul", instructions: b.instructions, criteria: b.criteria };
  }
  return questions;
}

export function subtitleState(topic: string, recent: string, earlier: string) {
  return {
    context: "Live transcript (Spanish, automatic speech recognition, may contain errors) of an improvised 1-2 minute speech at a Toastmasters game night.",
    tema: topic || "(tema libre / desconocido)",
    transcripcion_anterior: earlier || "(nada todavía)",
    transcripcion_reciente: recent,
  };
}

export function showSubtitle(state: SessionState, behaviorId: string, text: string, probability: number | null, now: number): SessionState {
  const sub = { behaviorId, text, at: now, probability };
  return {
    ...state,
    subtitles: {
      ...state.subtitles,
      current: sub,
      lastShownAt: now,
      lastByBehavior: { ...state.subtitles.lastByBehavior, [behaviorId]: now },
      lastPhraseByBehavior: { ...state.subtitles.lastPhraseByBehavior, [behaviorId]: text },
      history: [sub, ...state.subtitles.history].slice(0, HISTORY),
    },
  };
}

export const subtitulosEngine: GameEngine = {
  buildRequest(state, now): JevRequest | null {
    const recent = recentTranscript(state, now, RECENT_SECONDS);
    if (recent.length < 20 || state.behaviors.length === 0) return null;
    return {
      input: recent,
      state: subtitleState(state.topic, recent, earlierTranscript(state, now, RECENT_SECONDS)),
      questions: subtitleQuestions(state.behaviors),
    };
  },

  apply(state, answers, now): ApplyResult {
    const s = state.settings;
    const scored = state.behaviors
      .map((b) => ({ b, p: (answers[b.id] as NoulAnswer | undefined)?.noul ?? 0 }))
      .sort((x, y) => y.p - x.p);
    const scores: Record<string, number> = {};
    for (const { b, p } of scored) scores[b.id] = (state.subtitles.scores[b.id] ?? 0) * (1 - EMA_ALPHA) + p * EMA_ALPHA;
    const withScores: SessionState = { ...state, subtitles: { ...state.subtitles, scores } };
    const top = scored.slice(0, 3).map((x) => `${x.b.id} ${x.p.toFixed(2)}`).join(", ");

    const sinceLast = (now - state.subtitles.lastShownAt) / 1000;
    if (sinceLast < s.subtitleMinGapSeconds) {
      return { state: withScores, outcome: `silencio (${sinceLast.toFixed(0)}s desde el último) · top: ${top}` };
    }
    const offCooldown = ({ b }: { b: Behavior }) => (now - (state.subtitles.lastByBehavior[b.id] ?? 0)) / 1000 >= s.subtitleCooldownSeconds;
    let eligible = scored.filter(({ b, p }) => p >= (b.threshold ?? s.subtitleThreshold) && offCooldown({ b }));
    let reason = "umbral";
    if (eligible.length === 0 && sinceLast >= s.subtitleMaxSilenceSeconds) {
      eligible = scored.filter(({ b, p }) => p >= s.subtitleFloor && offCooldown({ b }));
      reason = "cadencia";
    }
    if (eligible.length === 0) return { state: withScores, outcome: `nada seguro · top: ${top}` };
    // Near-ties are broken at random so the same label does not always win.
    const near = eligible.filter((e) => e.p >= eligible[0].p - 0.03);
    const { b, p } = pickRandom(near);
    const text = pickRandom(b.phrases, state.subtitles.lastPhraseByBehavior[b.id]);
    return { state: showSubtitle(withScores, b.id, text, p, now), outcome: `«${text}» (${b.id} ${p.toFixed(2)}, ${reason})` };
  },
};
