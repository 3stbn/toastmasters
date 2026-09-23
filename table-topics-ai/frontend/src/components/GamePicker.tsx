import { useState } from "react";
import { GAME_MODES, type SessionState } from "@shared/session";
import type { ClientAction, ConfigPatch } from "@shared/protocol";
import { Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function GamePicker({
  state,
  onPatch,
  onAction,
}: {
  state: SessionState;
  onPatch: (patch: ConfigPatch) => void;
  onAction: (action: ClientAction) => void;
}) {
  const selected = GAME_MODES.find((g) => g.id === state.mode);
  const [custom, setCustom] = useState("");
  // The three drawn suggestions, plus a typed topic when there is one.
  const options = state.topic && !state.topicOptions.includes(state.topic) ? [...state.topicOptions, state.topic] : state.topicOptions;
  const submitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const t = custom.trim();
    if (!t) return;
    onPatch({ topic: t });
    setCustom("");
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {GAME_MODES.map((g) => {
          const active = state.mode === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onPatch({ mode: g.id })}
              className={cn(
                "rounded-xl border px-3 py-3 text-left font-display text-base leading-tight font-semibold transition-colors",
                active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50",
              )}
            >
              {g.title}
            </button>
          );
        })}
      </div>
      {selected && <p className="text-sm text-muted-foreground">{selected.tagline}</p>}

      {state.mode && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              {state.mode === "ilustrador" ? "Título de la charla" : "Tema"} · opcional
            </span>
            <Button variant="ghost" size="sm" onClick={() => onAction({ type: "shuffle_topics" })}>
              <Shuffle className="size-4" /> Otros tres
            </Button>
          </div>
          <div className="grid gap-2">
            {options.map((t, i) => {
              const active = state.topic === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onPatch({ topic: active ? "" : t })}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                    active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50",
                  )}
                >
                  <span className={cn("font-mono text-xs", active ? "text-primary" : "text-muted-foreground")}>{i + 1}</span>
                  <span className={cn("font-display text-lg", active && "font-semibold")}>{t}</span>
                </button>
              );
            })}
          </div>
          <form onSubmit={submitCustom} className="flex gap-2">
            <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Otro tema…" maxLength={120} autoComplete="off" />
            <Button type="submit" variant="outline" disabled={!custom.trim()}>
              Usar
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">Sin tema también funciona: habla de lo que quieras.</p>
        </div>
      )}
    </div>
  );
}
