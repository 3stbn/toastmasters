/**
 * Audio for the projector screen. Music is preloaded and decoded into
 * memory (Web Audio buffers) so a mood change plays instantly with no
 * network hiccup; playback crossfades through gain nodes. One AudioContext
 * must be unlocked by a user gesture before anything is audible.
 */
let ctx: AudioContext | null = null;

function context(): AudioContext {
  ctx ??= new AudioContext();
  return ctx;
}

export async function unlockAudio(): Promise<void> {
  const c = context();
  if (c.state !== "running") await c.resume();
  // macOS/iOS can put the context in "interrupted" (device change, call);
  // resume as soon as it happens so the music does not stay silent.
  c.onstatechange = () => {
    if ((c.state as string) !== "running") void c.resume().catch(() => {});
  };
  // A silent blip inside the gesture satisfies the strictest autoplay policies.
  const buf = c.createBuffer(1, 1, c.sampleRate);
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(c.destination);
  src.start();
  if ("speechSynthesis" in window) speechSynthesis.getVoices();
}

export function audioUnlocked(): boolean {
  return ctx?.state === "running";
}

/** Rising three-note attention chime, synthesised so no file is needed. */
export function chime(volume = 0.6) {
  if (!audioUnlocked()) return;
  const c = context();
  const t0 = c.currentTime;
  const notes: [number, number][] = [
    [880, 0],
    [1174.66, 0.18],
    [1567.98, 0.36],
  ];
  for (const [freq, dt] of notes) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t0 + dt);
    gain.gain.linearRampToValueAtTime(volume, t0 + dt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dt + 0.9);
    osc.connect(gain).connect(c.destination);
    osc.start(t0 + dt);
    osc.stop(t0 + dt + 1);
  }
}

export function speak(text: string, lang = "es-ES") {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 1.05;
  u.pitch = 1.1;
  const voice = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
  if (voice) u.voice = voice;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

interface Playing {
  src: AudioBufferSourceNode;
  gain: GainNode;
  url: string;
}

/** Preloads every track once, then loops one at a time with crossfades. */
export class MusicPlayer {
  private buffers = new Map<string, AudioBuffer>();
  private current: Playing | null = null;
  private volume = 0.5;
  private loading: Promise<void> | null = null;
  currentUrl: string | null = null;
  /** Tracks that failed to download/decode after retries. */
  missing = new Set<string>();

  /** Fetch + decode all URLs; progress is 0..1. Safe to call more than once. */
  preload(urls: string[], onProgress: (p: number) => void): Promise<void> {
    if (this.loading) return this.loading;
    this.loading = (async () => {
      const c = context();
      let done = 0;
      const total = urls.length;
      onProgress(0);
      // Four at a time keeps the venue wifi busy without stalling the page.
      const load = async (url: string) => {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const res = await fetch(url, { cache: "force-cache" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.arrayBuffer();
            this.buffers.set(url, await c.decodeAudioData(data));
            this.missing.delete(url);
            return;
          } catch {
            await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          }
        }
        this.missing.add(url);
      };
      const queue = [...urls];
      const worker = async () => {
        while (queue.length) {
          await load(queue.shift()!);
          done++;
          onProgress(done / total);
        }
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
      onProgress(1);
    })();
    return this.loading;
  }

  get loaded(): boolean {
    return this.buffers.size > 0;
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.current) this.current.gain.gain.setTargetAtTime(this.volume, context().currentTime, 0.1);
  }

  /** Plays `url`, or the first of `fallbacks` that did load. Returns what is playing. */
  play(url: string, fallbacks: string[] = [], fadeSeconds = 1.8): string | null {
    const chosen = [url, ...fallbacks].find((u) => this.buffers.has(u)) ?? null;
    if (!chosen) return null;
    if (chosen === this.currentUrl && this.current) return chosen;
    const buffer = this.buffers.get(chosen)!;
    if (!audioUnlocked()) return null;
    const c = context();
    const t = c.currentTime;
    const prev = this.current;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, this.volume), t + fadeSeconds);
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(gain).connect(c.destination);
    src.start(t);
    this.current = { src, gain, url: chosen };
    this.currentUrl = chosen;
    if (prev) this.fadeOut(prev, fadeSeconds);
    return chosen;
  }

  stop(fadeSeconds = 1.2) {
    if (!this.current) return;
    this.fadeOut(this.current, fadeSeconds);
    this.current = null;
    this.currentUrl = null;
  }

  private fadeOut(p: Playing, seconds: number) {
    const c = context();
    const t = c.currentTime;
    p.gain.gain.cancelScheduledValues(t);
    p.gain.gain.setValueAtTime(Math.max(0.0001, p.gain.gain.value), t);
    p.gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    p.src.stop(t + seconds + 0.05);
  }
}
