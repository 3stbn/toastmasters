/** The judge's view: every Jev round-trip with its raw probabilities. */
import type { DecisionLog as Decision, SessionState } from "@shared/session";
import { cn } from "@/lib/utils";

type Answer =
  | { type: "noul"; noul: number }
  | { type: "choice"; choice: string; probabilities: Record<string, number>; confidence: number }
  | { type: "score"; score: number; probabilities: Record<string, number>; confidence: number };

function Bar({ value, className }: { value: number; className?: string }) {
  return (
    <span className="inline-block h-1.5 w-20 overflow-hidden rounded bg-muted align-middle">
      <span className={cn("block h-full rounded bg-primary", className)} style={{ width: `${Math.round(value * 100)}%` }} />
    </span>
  );
}

function Answers({ d, state }: { d: Decision; state: SessionState }) {
  const entries = Object.entries(d.answers) as [string, Answer][];
  if (entries.length === 0) return null;
  const nouls = entries.filter(([, a]) => a.type === "noul") as [string, { type: "noul"; noul: number }][];
  const others = entries.filter(([, a]) => a.type !== "noul");
  return (
    <div className="mt-2 space-y-2">
      {nouls.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs sm:grid-cols-3">
          {nouls
            .sort((a, b) => b[1].noul - a[1].noul)
            .map(([id, a]) => {
              const b = state.behaviors.find((x) => x.id === id);
              const hot = a.noul >= (b?.threshold ?? state.settings.subtitleThreshold);
              return (
                <div key={id} className="flex items-center gap-2">
                  <Bar value={a.noul} className={hot ? "bg-success" : "bg-primary/60"} />
                  <span className={cn("tabular", hot && "font-semibold text-success")}>{a.noul.toFixed(2)}</span>
                  <span className="truncate text-muted-foreground">{b?.label ?? id}</span>
                </div>
              );
            })}
        </div>
      )}
      {others.map(([id, a]) => (
        <div key={id} className="text-xs">
          <div className="text-muted-foreground">
            {id}: <span className="font-semibold text-foreground">{a.type === "choice" ? a.choice : a.type === "score" ? a.score.toFixed(2) : ""}</span>
            {"confidence" in a && <span className="tabular"> · confianza {a.confidence.toFixed(2)}</span>}
          </div>
          {"probabilities" in a && (
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
              {Object.entries(a.probabilities)
                .sort((x, y) => y[1] - x[1])
                .map(([k, p]) => (
                  <span key={k} className="flex items-center gap-1.5">
                    <Bar value={p} /> <span className="tabular">{Math.round(p * 100)}%</span> <span className="text-muted-foreground">{k}</span>
                  </span>
                ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function DecisionLog({ state }: { state: SessionState }) {
  if (state.decisions.length === 0) {
    return <p className="text-sm text-muted-foreground">Cuando el juego esté en marcha y llegue voz, aquí verás cada decisión con sus probabilidades.</p>;
  }
  return (
    <ol className="space-y-3">
      {state.decisions.map((d) => (
        <li key={d.at} className="rounded-lg border border-border bg-background/40 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground tabular">
            <span>{new Date(d.at).toLocaleTimeString("es", { hour12: false })}</span>
            <span>· {d.latencyMs} ms</span>
            <span className={cn("rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider", d.engine === "local" ? "bg-warning/20 text-warning" : "bg-muted")}>
              {d.engine === "local" ? "local" : "nube"}
            </span>
          </div>
          <div className={cn("mt-1 text-sm font-medium", d.outcome.startsWith("error") ? "text-destructive" : "")}>{d.outcome}</div>
          {d.input && <p className="mt-1 text-xs text-muted-foreground italic">“{d.input}”</p>}
          <Answers d={d} state={state} />
        </li>
      ))}
    </ol>
  );
}
