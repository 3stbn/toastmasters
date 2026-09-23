/**
 * "Ilustrador automático": a whiteboard Jev draws on while the speaker
 * talks. Every evaluation (interim text included) Jev picks the doodle that
 * best represents what is being said, how emphatic it is (size) and the
 * marker colour (emotional tone). A doodle is drawn when the same pick comes
 * twice in a row (or once with high probability), never faster than
 * doodleMinSeconds, and never repeating the last few. Every second element is
 * a photo pasted like a polaroid, chosen among a few candidates from the
 * slide pool. Elements are laid along a meandering path, like a mind map;
 * a full page is wiped and a new one starts.
 */
import slidesJson from "../../../../shared/slides.json";
import { DOODLES, MARKERS } from "../../../../shared/doodles";
import type { CanvasElement, SessionState } from "../../../../shared/session";
import type { ChoiceAnswer, ScoreAnswer } from "../jev.service";
import { type ApplyResult, type GameEngine, type JevRequest, recentTranscript } from "./types";

export interface Slide {
  id: string;
  caption: string;
  description: string;
  file: string;
}
export const SLIDES: Slide[] = slidesJson as Slide[];

const RECENT_SECONDS = 10;
const RECENT_AVOID = 6;
const PHOTO_EVERY = 2;
const PHOTO_CANDIDATES = 8;
const INSTANT_PROBABILITY = 0.5;
const MIN_PROBABILITY = 0.18;

const doodleCriteria: Record<string, string> = Object.fromEntries(DOODLES.map((d) => [d.id, d.description]));
const markerCriteria: Record<string, string> = Object.fromEntries(MARKERS.map((m) => [m.id, m.description]));

/** Slot n of a snake path over a 6×4 grid, with seeded jitter. */
function slot(n: number, seed: number): { x: number; y: number; tilt: number } {
  const cols = 6;
  const rows = 4;
  const row = Math.floor(n / cols) % rows;
  const colRaw = n % cols;
  const col = row % 2 === 0 ? colRaw : cols - 1 - colRaw;
  const r = (k: number) => {
    const v = Math.sin(seed * 12.9898 + n * 78.233 + k * 37.719) * 43758.5453;
    return v - Math.floor(v);
  };
  return {
    x: Math.min(0.92, Math.max(0.08, (col + 0.5) / cols + (r(1) - 0.5) * 0.06)),
    y: 0.13 + (row + 0.5) * 0.19 + (r(2) - 0.5) * 0.03,
    tilt: (r(3) - 0.5) * 14,
  };
}

function sample<T>(items: T[], n: number, seed: number): T[] {
  const arr = [...items];
  let s = seed || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

export function newPage(state: SessionState): SessionState {
  return { ...state, canvas: { ...state.canvas, elements: [], page: state.canvas.page + 1, pending: null } };
}

function place(state: SessionState, partial: Omit<CanvasElement, "id" | "x" | "y" | "tilt">): SessionState {
  let c = state.canvas;
  if (c.elements.length >= state.settings.doodlesPerPage) c = newPage(state).canvas;
  const pos = slot(c.elements.length, state.createdAt + c.page * 7);
  const el: CanvasElement = { id: c.nextId, x: pos.x, y: pos.y, tilt: pos.tilt, ...partial };
  return {
    ...state,
    canvas: {
      ...c,
      elements: [...c.elements, el],
      nextId: c.nextId + 1,
      pending: null,
      recent: [...c.recent, partial.ref].slice(-RECENT_AVOID),
      usedPhotos: partial.kind === "photo" ? [...c.usedPhotos, partial.ref] : c.usedPhotos,
    },
  };
}

export const ilustradorEngine: GameEngine = {
  buildRequest(state, now): JevRequest | null {
    const recent = recentTranscript(state, now, RECENT_SECONDS, 3);
    if (recent.length < 12) return null;
    const c = state.canvas;
    const wantPhoto = (c.elements.length + 1) % PHOTO_EVERY === 0;
    const questions: JevRequest["questions"] = {
      doodle: {
        type: "choice",
        instructions:
          "You are a cartoonist doodling live next to the speaker, for the audience to laugh. Which emoji best captures what the speaker is saying right now (speaker_is_saying)? It can be the literal thing mentioned, or a witty take: the audience's reaction, an exaggeration, or the subtext (options marked REACTION). Prefer the funnier choice when it clearly fits; otherwise the literal one.",
        criteria: Object.fromEntries(Object.entries(doodleCriteria).filter(([id]) => !c.recent.includes(id))),
      },
      emphasis: {
        type: "score",
        instructions: "How emphatic or important is what the speaker is saying right now?",
        criteria: ["Passing mention, small detail", "Normal part of the story", "Big moment: the key point, a climax, strong emotion"],
      },
      marker: {
        type: "choice",
        instructions: "Which marker colour fits the emotional tone of speaker_is_saying?",
        criteria: markerCriteria,
      },
    };
    if (wantPhoto) {
      const pool = SLIDES.filter((s) => !c.usedPhotos.includes(s.id));
      const cands = sample(pool.length >= PHOTO_CANDIDATES ? pool : SLIDES, PHOTO_CANDIDATES, state.createdAt + c.nextId);
      questions.photo = {
        type: "choice",
        instructions: "Which photo best illustrates, literally or absurdly, what the speaker is saying right now?",
        criteria: Object.fromEntries(cands.map((s) => [s.id, s.description])),
      };
    }
    return {
      input: recent,
      state: {
        context: "A live whiteboard is being drawn while someone improvises a short speech in Spanish at a comedy game night. You choose what to draw next: it should represent what is said, with humour when possible.",
        tema: state.topic || "(tema libre)",
        already_drawn: c.elements.slice(-5).map((e) => e.label),
        speaker_is_saying: recent,
      },
      questions,
    };
  },

  apply(state, answers, now): ApplyResult {
    const pick = answers.doodle as ChoiceAnswer | undefined;
    const emphasis = answers.emphasis as ScoreAnswer | undefined;
    const marker = answers.marker as ChoiceAnswer | undefined;
    const photo = answers.photo as ChoiceAnswer | undefined;
    if (!pick) return { state, outcome: "sin respuesta" };
    const c = state.canvas;
    const last = c.elements.at(-1);
    const sinceLast = last ? (now - last.at) / 1000 : Infinity;
    const p = pick.probabilities[pick.choice] ?? 0;
    const size = Math.min(3, Math.max(1, Math.round((emphasis?.score ?? 1) + 1))) as 1 | 2 | 3;
    const color = marker?.choice ?? "negro";
    const status = `${pick.choice} ${Math.round(p * 100)}% · tamaño ${size} · ${color}`;

    if (sinceLast < state.settings.doodleMinSeconds) {
      return { state: { ...state, canvas: { ...c, pending: pick.choice } }, outcome: `espera ${sinceLast.toFixed(1)}s · ${status}` };
    }

    // Photo turn: paste a polaroid if Jev leans towards one candidate.
    if (photo) {
      const pp = photo.probabilities[photo.choice] ?? 0;
      const slide = SLIDES.find((s) => s.id === photo.choice);
      if (slide && pp >= 0.2) {
        const next = place(state, { kind: "photo", ref: slide.id, label: slide.caption, file: slide.file, size: 2, color, at: now, probability: pp });
        return { state: next, outcome: `foto → ${slide.caption} (${Math.round(pp * 100)}%)` };
      }
    }

    const confirmed = p >= INSTANT_PROBABILITY || c.pending === pick.choice;
    if (p < MIN_PROBABILITY || !confirmed) {
      return { state: { ...state, canvas: { ...c, pending: pick.choice } }, outcome: `pendiente · ${status}` };
    }
    const d = DOODLES.find((x) => x.id === pick.choice);
    if (!d) return { state, outcome: `garabato desconocido ${pick.choice}` };
    const next = place(state, { kind: "doodle", ref: d.id, label: d.label, size, color, at: now, probability: p });
    return { state: next, outcome: `dibuja ${d.label} · ${status}` };
  },
};
