/**
 * Moods for "Banda sonora". `criteria` is what Jev sees (English, since that is
 * the model's strongest language); `label` is what the audience sees.
 */
export interface Mood {
  id: string;
  label: string;
  emoji: string;
  /** Jev choice criteria — one line describing the tone of speech that fits. */
  criteria: string;
  /** Accent colour for the projector (oklch). */
  color: string;
}

export const MOODS: Mood[] = [
  {
    id: "neutro",
    label: "Neutro",
    emoji: "🎙️",
    criteria:
      "Plain, matter-of-fact speech with no strong emotional tone: introductions, listing facts, calm explanation.",
    color: "oklch(0.72 0.03 80)",
  },
  {
    id: "epico",
    label: "Épico",
    emoji: "⚔️",
    criteria:
      "Grand, heroic, triumphant tone: big claims, battles, overcoming obstacles, destiny, greatness, calls to action.",
    color: "oklch(0.75 0.16 60)",
  },
  {
    id: "drama",
    label: "Drama",
    emoji: "🎭",
    criteria:
      "Sad, serious or emotional tone: loss, regret, hardship, heartfelt confession, solemn reflection.",
    color: "oklch(0.62 0.12 260)",
  },
  {
    id: "suspense",
    label: "Suspense",
    emoji: "🕵️",
    criteria:
      "Tense, mysterious tone: secrets, something is about to happen, uncertainty, investigation, danger looming.",
    color: "oklch(0.6 0.1 200)",
  },
  {
    id: "romantico",
    label: "Romántico",
    emoji: "💘",
    criteria:
      "Tender, affectionate tone: love, dates, crushes, sweet memories, devotion, flirting.",
    color: "oklch(0.7 0.16 350)",
  },
  {
    id: "comedia",
    label: "Comedia",
    emoji: "🤡",
    criteria:
      "Light, silly, humorous tone: jokes, absurd situations, self-deprecation, playful exaggeration for laughs.",
    color: "oklch(0.82 0.16 95)",
  },
  {
    id: "telenovela",
    label: "Telenovela",
    emoji: "😱",
    criteria:
      "Over-the-top melodrama: betrayal, jealousy, family secrets, dramatic revelations, passionate accusations, 'nobody understands me'.",
    color: "oklch(0.62 0.2 20)",
  },
  {
    id: "terror",
    label: "Terror",
    emoji: "👻",
    criteria:
      "Scary, creepy tone: fear, horror stories, ghosts, nightmares, dread, something disturbing.",
    color: "oklch(0.5 0.12 300)",
  },
];

export const MOOD_IDS = MOODS.map((m) => m.id);
export const DEFAULT_MOOD = "neutro";
