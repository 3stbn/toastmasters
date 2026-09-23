/**
 * "Banda sonora": a single choice question over the mood list. Probabilities
 * are smoothed with an exponential moving average and the music only
 * switches when a mood clearly leads and enough time has passed, so a
 * single odd sentence does not flip the track.
 */
import { DEFAULT_MOOD, MOODS } from "../../../../shared/moods";
import { MUSIC } from "../../../../shared/music";
import type { SessionState } from "../../../../shared/session";
import type { ChoiceAnswer } from "../jev.service";
import { type ApplyResult, type GameEngine, type JevRequest, recentTranscript } from "./types";

const RECENT_SECONDS = 20;
const EMA_ALPHA = 0.55;

export const moodCriteria: Record<string, string> = Object.fromEntries(MOODS.map((m) => [m.id, m.criteria]));

export function moodState(topic: string, recent: string) {
  return {
    context: "Live transcript (Spanish, automatic speech recognition) of an improvised speech. Judge the emotional tone of what is being said, as a film composer would to pick background music.",
    tema: topic || "(tema libre)",
    transcripcion_reciente: recent,
  };
}

export function setMood(state: SessionState, mood: string, now: number): SessionState {
  const same = state.banda.mood === mood;
  const tracks = MUSIC[mood] ?? [];
  const trackIndex = same ? state.banda.trackIndex : tracks.length ? Math.floor(Math.random() * tracks.length) : 0;
  return { ...state, banda: { ...state.banda, mood, since: same ? state.banda.since : now, trackIndex } };
}

export const bandaEngine: GameEngine = {
  buildRequest(state, now): JevRequest | null {
    const recent = recentTranscript(state, now, RECENT_SECONDS);
    if (recent.length < 25) return null;
    return {
      input: recent,
      state: moodState(state.topic, recent),
      questions: {
        mood: {
          type: "choice",
          instructions: "Which background-music mood best matches the tone of transcripcion_reciente?",
          criteria: moodCriteria,
        },
      },
    };
  },

  apply(state, answers, now): ApplyResult {
    const a = answers.mood as ChoiceAnswer | undefined;
    if (!a) return { state, outcome: "sin respuesta" };
    const scores: Record<string, number> = {};
    for (const m of MOODS) {
      const prev = state.banda.scores[m.id] ?? (m.id === DEFAULT_MOOD ? 0.5 : 0);
      scores[m.id] = prev * (1 - EMA_ALPHA) + (a.probabilities[m.id] ?? 0) * EMA_ALPHA;
    }
    const current = state.banda.mood;
    const [leader, leaderScore] = Object.entries(scores).sort((x, y) => y[1] - x[1])[0];
    const s = state.settings;
    const sinceSwitch = (now - state.banda.since) / 1000;
    const summary = `Jev: ${a.choice} (${((a.probabilities[a.choice] ?? 0) * 100).toFixed(0)}%, conf ${a.confidence.toFixed(2)}) · líder suavizado: ${leader} ${leaderScore.toFixed(2)}`;
    const next = { ...state, banda: { ...state.banda, scores } };
    if (leader === current) return { state: next, outcome: `se mantiene ${current} · ${summary}` };
    if (sinceSwitch < s.moodMinIntervalSeconds) return { state: next, outcome: `espera (${sinceSwitch.toFixed(0)}s en ${current}) · ${summary}` };
    if (leaderScore < s.moodSwitchThreshold || leaderScore - (scores[current] ?? 0) < s.moodSwitchMargin) {
      return { state: next, outcome: `no convence aún · ${summary}` };
    }
    return { state: setMood(next, leader, now), outcome: `cambia a ${leader} · ${summary}` };
  },
};
