import type { GameMode } from "../../../../shared/session";
import { bandaEngine } from "./banda";
import { ilustradorEngine } from "./ilustrador";
import { subtitulosEngine } from "./subtitulos";
import type { GameEngine } from "./types";

export const ENGINES: Record<GameMode, GameEngine> = {
  ilustrador: ilustradorEngine,
  subtitulos: subtitulosEngine,
  banda: bandaEngine,
};

export { newPage, SLIDES } from "./ilustrador";
export { setMood } from "./banda";
export { showSubtitle } from "./subtitulos";
