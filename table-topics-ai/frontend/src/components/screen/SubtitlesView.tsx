/**
 * TV-style live captions plus, above them, the room's running "truth":
 * a history of the last subtexts on the left and a live meter of what the
 * detector is picking up on the right. Everything is automatic.
 */
import type { SessionState } from "@shared/session";
import { cn } from "@/lib/utils";

const MAX_CHARS = 110;

function tail(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(text.length - max);
  const space = cut.indexOf(" ");
  return "…" + (space > 0 ? cut.slice(space + 1) : cut);
}

export function SubtitlesView({ state, interim, now }: { state: SessionState; interim: string; now: number }) {
  const sub = state.subtitles.current;
  const truth = !!sub && now - sub.at < state.settings.subtitleDurationSeconds * 1000;
  const recent = state.transcript.slice(-2).map((s) => s.text).join(" ");
  const live = tail([recent, interim].filter(Boolean).join(" "), MAX_CHARS);
  const history = state.subtitles.history.filter((h) => !truth || h.at !== sub?.at).slice(0, 5);
  const meter = state.behaviors
    .map((b) => ({ b, s: state.subtitles.scores[b.id] ?? 0 }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 6);

  return (
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.22_0.02_55),oklch(0.1_0.01_55)_70%)]">
      {state.topic && <h2 className="absolute top-12 left-16 font-display text-3xl text-white/70 italic">{state.topic}</h2>}

      {/* Middle band: history (left) and detector (right). */}
      <div className="absolute inset-x-16 top-[22%] bottom-[36%] grid grid-cols-[1.3fr_1fr] gap-16">
        <div className="flex flex-col justify-end gap-3">
          {history.map((h, i) => (
            <p key={h.at} className={cn("font-sans text-4xl font-semibold text-warning", i === 0 ? "opacity-70" : i === 1 ? "opacity-45" : i === 2 ? "opacity-30" : "opacity-18")}>
              {h.text}
            </p>
          ))}
        </div>
        <div className="flex flex-col justify-end gap-3">
          <div className="font-mono text-xs uppercase tracking-[0.35em] text-white/40">Detector</div>
          {meter.map(({ b, s }) => (
            <div key={b.id} className="flex items-center gap-4">
              <span className="w-44 truncate font-sans text-xl text-white/80">{b.label}</span>
              <span className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-warning/80 transition-all duration-500" style={{ width: `${Math.round(s * 100)}%` }} />
              </span>
              <span className="w-12 text-right font-mono text-sm text-white/50 tabular">{Math.round(s * 100)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-[7%] flex justify-center px-12">
        <div className="w-full max-w-[1500px]">
          <div className="mb-3 px-4 font-mono text-xs uppercase tracking-[0.35em] text-white/40">
            <span className={truth ? "text-warning" : ""}>{truth ? "● subtítulos automáticos · subtexto" : "● subtítulos automáticos"}</span>
          </div>
          <div className="min-h-[11rem] rounded-2xl bg-black/75 px-10 py-6 text-center shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-sm">
            <p className={truth ? "font-sans text-[2.4rem] leading-[1.15] font-medium text-white/85" : "font-sans text-[3.6rem] leading-[1.15] font-semibold text-white"}>
              {live || <span className="text-white/30">…</span>}
              {interim && <span className="ml-2 inline-block h-[0.9em] w-[3px] translate-y-1 animate-pulse bg-white/70" />}
            </p>
            {truth && sub && (
              <p key={sub.at} className="subtitle-text animate-in fade-in slide-in-from-bottom-2 mt-3 font-sans text-[4.4rem] leading-[1.1] font-bold duration-200">
                {sub.text}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
