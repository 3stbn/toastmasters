/**
 * Session state shared by the Durable Object (source of truth) and the
 * frontend (renders it). Everything here is JSON-serialisable.
 */
import type { Behavior } from "./phrases";

export type GameMode = "ilustrador" | "subtitulos" | "banda";

export const GAME_MODES: { id: GameMode; title: string; tagline: string }[] = [
  {
    id: "ilustrador",
    title: "Ilustrador automático",
    tagline: "Una pizarra dibuja en directo lo que dices: garabatos, flechas y alguna foto. El público lo ve; tú no.",
  },
  {
    id: "subtitulos",
    title: "Subtítulos de la verdad",
    tagline: "El público lee en pantalla lo que dices y, debajo, lo que de verdad está pasando.",
  },
  {
    id: "banda",
    title: "Banda sonora",
    tagline: "La música de fondo cambia con el tono del discurso.",
  },
];

/** Who answers the questions: TypeSafe Jev through OpenRouter, or the SemIf service on the Mac. */
export type DecisionEngine = "jev" | "local";

export interface SessionSettings {
  /** BCP-47 tag for the browser speech recogniser. */
  lang: string;
  /** Decision engine for this session. */
  engine: DecisionEngine;
  /** Seconds between two doodles on the whiteboard. */
  doodleMinSeconds: number;
  /** Doodles per page before the board is wiped. */
  doodlesPerPage: number;
  /** Default noul probability that shows a subtitle instantly (per-behaviour override in the bank). */
  subtitleThreshold: number;
  /** Seconds between two subtitles. */
  subtitleMinGapSeconds: number;
  /** If nothing cleared the threshold for this long, show the most likely behaviour anyway… */
  subtitleMaxSilenceSeconds: number;
  /** …as long as it is at least this likely. */
  subtitleFloor: number;
  /** Seconds before the same behaviour may fire again. */
  subtitleCooldownSeconds: number;
  /** Seconds a subtitle stays on screen. */
  subtitleDurationSeconds: number;
  /** Seconds between two mood changes. */
  moodMinIntervalSeconds: number;
  /** Smoothed probability a mood needs to take over. */
  moodSwitchThreshold: number;
  /** Margin over the current mood's smoothed probability. */
  moodSwitchMargin: number;
  /** Music volume 0..1 on the screen. */
  musicVolume: number;
  /** Speak "¡Mira atrás!" on the turn-around cue (besides the chime). */
  voiceCue: boolean;
}

/** A round stops by itself after this long, so a forgotten session cannot keep calling the engine. */
export const MAX_ROUND_MINUTES = 10;

export const DEFAULT_SETTINGS: SessionSettings = {
  lang: "es-ES",
  engine: "jev",
  doodleMinSeconds: 2.5,
  doodlesPerPage: 24,
  subtitleThreshold: 0.75,
  subtitleMinGapSeconds: 4,
  subtitleMaxSilenceSeconds: 7,
  subtitleFloor: 0.3,
  subtitleCooldownSeconds: 25,
  subtitleDurationSeconds: 4.5,
  moodMinIntervalSeconds: 12,
  moodSwitchThreshold: 0.35,
  moodSwitchMargin: 0.12,
  musicVolume: 0.5,
  voiceCue: true,
};

export interface TranscriptSegment {
  text: string;
  /** Epoch ms when the final result arrived. */
  at: number;
}

/** One thing drawn on the whiteboard. Positions are 0..1 of the canvas. */
export interface CanvasElement {
  id: number;
  kind: "doodle" | "photo";
  /** Doodle: lucide icon name. Photo: slide id. */
  ref: string;
  /** Handwritten label under the element. */
  label: string;
  /** Photo file (photos only). */
  file?: string;
  x: number;
  y: number;
  /** 1 small · 2 medium · 3 big */
  size: 1 | 2 | 3;
  /** Marker colour id (see shared/doodles.ts). */
  color: string;
  /** Slight rotation in degrees, for the hand-drawn feel. */
  tilt: number;
  at: number;
  /** Jev's probability for this pick. */
  probability: number;
}

export interface Subtitle {
  behaviorId: string;
  text: string;
  at: number;
  /** Noul probability that triggered it (null when forced by the operator). */
  probability: number | null;
}

/** One Jev round-trip, kept for the operator's judge view. */
export interface DecisionLog {
  at: number;
  mode: GameMode;
  /** Text Jev looked at (recent transcript). */
  input: string;
  /** Raw answers, as returned. */
  answers: Record<string, unknown>;
  /** What the game did with them. */
  outcome: string;
  latencyMs: number;
  costUsd: number;
  /** Which engine answered (older logs have none = jev). */
  engine?: DecisionEngine;
}

export interface SessionState {
  code: string;
  createdAt: number;
  mode: GameMode | null;
  topic: string;
  /** The three topics currently offered to the speaker (one becomes `topic`). */
  topicOptions: string[];
  /** Topics already used in this session, so redraws avoid them. */
  usedTopics: string[];
  running: boolean;
  /** Epoch ms of the current round's Empezar (0 when stopped); the round auto-stops MAX_ROUND_MINUTES later. */
  runningSince: number;
  settings: SessionSettings;
  behaviors: Behavior[];
  transcript: TranscriptSegment[];
  interim: string;
  canvas: {
    elements: CanvasElement[];
    page: number;
    /** Element Jev proposed last time; it must repeat before we draw it (no jitter). */
    pending: string | null;
    /** Ids drawn recently (across pages) so the board does not repeat itself. */
    recent: string[];
    /** Set by the operator: the screen chimes and shouts "¡Date la vuelta!". */
    cueAt: number;
    /** Photos already pasted. */
    usedPhotos: string[];
    nextId: number;
  };
  subtitles: {
    current: Subtitle | null;
    lastShownAt: number;
    lastByBehavior: Record<string, number>;
    lastPhraseByBehavior: Record<string, string>;
    /** Last subtitles, newest first, for the on-screen history. */
    history: Subtitle[];
    /** Smoothed probability per behaviour, for the live meter. */
    scores: Record<string, number>;
  };
  banda: {
    mood: string;
    since: number;
    /** Index into the mood's track list so the screen can rotate tracks. */
    trackIndex: number;
    /** Smoothed probabilities per mood. */
    scores: Record<string, number>;
  };
  decisions: DecisionLog[];
  stats: { jevCalls: number; jevCostUsd: number; jevErrors: number; lastError: string | null };
  clients: { screen: number; control: number; mic: number };
  /** True once a projector screen has unlocked audio (user gesture). */
  screenSound: boolean;
  /** 0..1 music preload progress reported by the screen; 1 = ready. */
  screenLoaded: number;
  /** Set by the phone: the screen plays a chime and says "sonido activado". */
  soundTestAt: number;
}
