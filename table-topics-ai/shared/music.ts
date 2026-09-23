/**
 * Background music per mood for "Banda sonora". All tracks are Kevin MacLeod
 * (incompetech.com), licensed CC BY 4.0 — the attribution is rendered on the
 * credits page. `backend/scripts/fetch-music.ts` downloads and trims them into
 * frontend/public/music/<file>.
 */
export interface MusicTrack {
  /** File name under /music (mp3). */
  file: string;
  title: string;
  /** Original file name on incompetech.com (for the fetch script). */
  source: string;
}

export const MUSIC: Record<string, MusicTrack[]> = {
  neutro: [
    { file: "neutro-vibing-over-venus.mp3", title: "Vibing Over Venus", source: "Vibing Over Venus.mp3" },
    { file: "neutro-morning.mp3", title: "Morning", source: "Morning.mp3" },
    { file: "neutro-wallpaper.mp3", title: "Wallpaper", source: "Wallpaper.mp3" },
  ],
  epico: [
    { file: "epico-killers.mp3", title: "Killers", source: "Killers.mp3" },
    { file: "epico-five-armies.mp3", title: "Five Armies", source: "Five Armies.mp3" },
    { file: "epico-heroic-age.mp3", title: "Heroic Age", source: "Heroic Age.mp3" },
  ],
  drama: [
    { file: "drama-sad-trio.mp3", title: "Sad Trio", source: "Sad Trio.mp3" },
    { file: "drama-bittersweet.mp3", title: "Bittersweet", source: "Bittersweet.mp3" },
    { file: "drama-night-vigil.mp3", title: "Night Vigil", source: "Night Vigil.mp3" },
  ],
  suspense: [
    { file: "suspense-stay-the-course.mp3", title: "Stay the Course", source: "Stay the Course.mp3" },
    { file: "suspense-investigations.mp3", title: "Investigations", source: "Investigations.mp3" },
    { file: "suspense-man-down.mp3", title: "Man Down", source: "Man Down.mp3" },
  ],
  romantico: [
    { file: "romantico-canon-in-d.mp3", title: "Canon in D for Two Harps", source: "Canon in D for Two Harps.mp3" },
    { file: "romantico-almost-bliss.mp3", title: "Almost Bliss", source: "Almost Bliss.mp3" },
    { file: "romantico-what-is-love.mp3", title: "What Is Love", source: "What Is Love.mp3" },
  ],
  comedia: [
    { file: "comedia-monkeys.mp3", title: "Monkeys Spinning Monkeys", source: "Monkeys Spinning Monkeys.mp3" },
    { file: "comedia-sneaky-snitch.mp3", title: "Sneaky Snitch", source: "Sneaky Snitch.mp3" },
    { file: "comedia-fluffing-a-duck.mp3", title: "Fluffing a Duck", source: "Fluffing a Duck.mp3" },
    { file: "comedia-scheming-weasel.mp3", title: "Scheming Weasel (faster)", source: "Scheming Weasel faster.mp3" },
  ],
  telenovela: [
    { file: "telenovela-evening-melodrama.mp3", title: "Evening Melodrama", source: "Evening Melodrama.mp3" },
    { file: "telenovela-tango-de-manzana.mp3", title: "Tango de Manzana", source: "Tango de Manzana.mp3" },
    { file: "telenovela-sardana.mp3", title: "Sardana", source: "Sardana.mp3" },
  ],
  terror: [
    { file: "terror-ossuary-6.mp3", title: "Ossuary 6 - Air", source: "Ossuary 6 - Air.mp3" },
    { file: "terror-ghost-story.mp3", title: "Ghost Story", source: "Ghost Story.mp3" },
    { file: "terror-tyrant.mp3", title: "Tyrant", source: "Tyrant.mp3" },
  ],
};
