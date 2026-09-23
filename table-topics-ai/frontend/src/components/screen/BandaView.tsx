import { MOODS } from "@shared/moods";
import { MUSIC } from "@shared/music";
import type { SessionState } from "@shared/session";

const BARS = 28;

export function BandaView({ state, interim }: { state: SessionState; interim: string }) {
  const mood = MOODS.find((m) => m.id === state.banda.mood) ?? MOODS[0];
  const tracks = MUSIC[mood.id] ?? [];
  const track = tracks[state.banda.trackIndex % Math.max(1, tracks.length)];
  const live = interim || state.transcript.at(-1)?.text || "";
  const sorted = MOODS.map((m) => ({ m, s: state.banda.scores[m.id] ?? 0 })).sort((a, b) => b.s - a.s);

  return (
    <div className="absolute inset-0 transition-colors duration-1000" style={{ background: `radial-gradient(ellipse at 50% 30%, ${mood.color} -60%, #0b0908 65%)` }}>
      <div className="absolute inset-x-0 top-[14%] text-center">
        <div className="font-mono text-sm uppercase tracking-[0.4em] text-white/60">Banda sonora</div>
        {state.topic && <div className="mt-3 font-display text-3xl text-white/70 italic">{state.topic}</div>}
      </div>

      <div key={mood.id} className="animate-in fade-in zoom-in-95 absolute inset-x-0 top-[30%] text-center duration-700">
        <div className="text-[7rem] leading-none">{mood.emoji}</div>
        <h2 className="mt-2 font-display text-8xl font-bold text-white drop-shadow-[0_6px_30px_rgba(0,0,0,0.6)]">{mood.label}</h2>
        {track && <div className="mt-3 font-mono text-sm tracking-widest text-white/50">♪ {track.title} · Kevin MacLeod</div>}
      </div>

      {/* Equaliser: purely decorative, paced by the mood. */}
      <div className="absolute inset-x-0 bottom-[22%] flex h-24 items-end justify-center gap-1.5 px-16">
        {Array.from({ length: BARS }, (_, i) => (
          <span
            key={i}
            className="w-3 origin-bottom rounded-t bg-white/80"
            style={{ height: "100%", animation: `bar ${0.9 + (i % 7) * 0.13}s ease-in-out ${(i % 5) * 0.11}s infinite`, opacity: 0.35 + ((i * 7) % 10) / 20, backgroundColor: mood.color }}
          />
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-[8%] px-24 text-center">
        <p className="mx-auto max-w-5xl font-display text-2xl text-white/45 italic">{live ? `“${live}”` : "…"}</p>
      </div>

      {/* Mood meter for the audience: what Jev is hearing right now. */}
      <div className="absolute top-14 left-6 space-y-1 font-mono text-[11px] tracking-widest text-white/50">
        {sorted.slice(0, 4).map(({ m, s }) => (
          <div key={m.id} className="flex items-center gap-2">
            <span className="w-24 uppercase">{m.label}</span>
            <span className="h-1.5 w-32 overflow-hidden rounded bg-white/10">
              <span className="block h-full rounded bg-white/60 transition-all duration-700" style={{ width: `${Math.round(s * 100)}%` }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
