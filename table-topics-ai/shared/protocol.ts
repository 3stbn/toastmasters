/** WebSocket messages between browsers and the session Durable Object. */
import type { GameMode, SessionSettings, SessionState } from "./session";
import type { Behavior } from "./phrases";

export type ClientRole = "screen" | "control" | "mic";

export interface ConfigPatch {
  mode?: GameMode | null;
  topic?: string;
  settings?: Partial<SessionSettings>;
  behaviors?: Behavior[];
}

export type ClientAction =
  | { type: "start" }
  | { type: "stop" }
  | { type: "reset" }
  | { type: "new_page" }
  | { type: "clear_subtitle" }
  | { type: "force_subtitle"; behaviorId?: string; text?: string }
  | { type: "force_mood"; mood: string }
  | { type: "next_track" }
  | { type: "shuffle_topics" }
  | { type: "test_sound" };

export type ClientMessage =
  | { type: "transcript"; text: string; final: boolean }
  | { type: "config"; patch: ConfigPatch }
  | { type: "action"; action: ClientAction }
  | { type: "screen"; sound: boolean; loaded: number }
  | { type: "ping" };

export type ServerMessage =
  | { type: "state"; state: SessionState }
  | { type: "interim"; text: string }
  | { type: "error"; message: string }
  | { type: "pong" };
