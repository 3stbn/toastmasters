/**
 * The operator's only page. A checklist guides setup (screen, mic, game),
 * then one big button runs the round. Everything advanced lives behind a
 * single disclosure at the bottom.
 */
import { useState } from "react";
import { useParams } from "wouter";
import { Check, ChevronDown, Copy, ExternalLink, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { MOODS } from "@shared/moods";
import { GAME_MODES, type SessionState } from "@shared/session";
import { useSession } from "@/hooks/useSession";
import { sessionUrl } from "@/lib/api";
import { GamePicker } from "@/components/GamePicker";
import { MicControl } from "@/components/MicControl";
import { QrCode } from "@/components/QrCode";
import { StatusBar } from "@/components/StatusBar";
import { DecisionLog } from "@/components/control/DecisionLog";
import { PhraseBankEditor } from "@/components/control/PhraseBankEditor";
import { SettingsPanel } from "@/components/control/SettingsPanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SessionMissing } from "./SessionMissing";

export function Session() {
  const { code = "" } = useParams<{ code: string }>();
  const upper = code.toUpperCase();
  const { state, interim, status, lastError, sendAction, sendConfig, sendTranscript } = useSession(upper, "control");
  const [micHere, setMicHere] = useState(false);
  const [advanced, setAdvanced] = useState<"none" | "log" | "bank" | "settings">("none");

  if (status === "missing") return <SessionMissing code={upper} />;

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado");
    } catch {
      toast.message(url);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pt-safe pb-safe">
      <div className="pt-4">
        <StatusBar state={state} status={status} title="Ajustes" />
      </div>
      {lastError && <p className="mt-2 text-sm text-destructive">{lastError}</p>}

      {!state ? (
        <p className="py-16 text-center text-muted-foreground">Cargando sesión…</p>
      ) : state.running ? (
        <Running state={state} interim={interim} sendAction={sendAction} />
      ) : (
        <Setup state={state} micHere={micHere} setMicHere={setMicHere} sendAction={sendAction} sendConfig={sendConfig} copy={copy} />
      )}

      {state && (micHere || state.running) && (
        <section className="mt-4 rounded-2xl border border-border bg-card p-4">
          {micHere ? (
            <MicControl lang={state.settings.lang} connected={status === "open"} sendTranscript={sendTranscript} />
          ) : null}
          {!micHere && state.running && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={micHere} onChange={(e) => setMicHere(e.target.checked)} />
              Usar el micrófono de este dispositivo
            </label>
          )}
        </section>
      )}

      {state && (
        <section className="mt-8 mb-10">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["log", "Decisiones"],
                ["bank", "Banco de frases"],
                ["settings", "Ajustes"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setAdvanced(advanced === id ? "none" : id)}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm",
                  advanced === id ? "border-primary text-foreground" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
                <ChevronDown className={cn("size-3.5 transition-transform", advanced === id && "rotate-180")} />
              </button>
            ))}
            {state.stats.jevErrors > 0 && (
              <span className="ml-auto self-center text-xs text-destructive">{state.stats.jevErrors} errores de conexión con la IA</span>
            )}
          </div>
          {advanced !== "none" && (
            <div className="mt-3 rounded-2xl border border-border bg-card p-4">
              {advanced === "log" && <DecisionLog state={state} />}
              {advanced === "bank" && <PhraseBankEditor state={state} onPatch={sendConfig} />}
              {advanced === "settings" && <SettingsPanel state={state} onPatch={sendConfig} />}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

type Send = ReturnType<typeof useSession>;

function Step({ n, done, title, children }: { n: number; done: boolean; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <div
        className={cn(
          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border font-mono text-sm",
          done ? "border-success bg-success/15 text-success" : "border-border text-muted-foreground",
        )}
      >
        {done ? <Check className="size-4" /> : n}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{title}</div>
        <div className="mt-2">{children}</div>
      </div>
    </li>
  );
}

function Setup({
  state,
  micHere,
  setMicHere,
  sendAction,
  sendConfig,
  copy,
}: {
  state: SessionState;
  micHere: boolean;
  setMicHere: (v: boolean) => void;
  sendAction: Send["sendAction"];
  sendConfig: Send["sendConfig"];
  copy: (url: string) => void;
}) {
  const micUrl = sessionUrl(state.code, "mic");
  const screenOk = state.clients.screen > 0;
  const micOk = state.clients.mic > 0 || micHere;
  const gameOk = !!state.mode && !!state.topic;
  const ready = screenOk && micOk && gameOk;

  return (
    <div className="py-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Ajustes de la ronda</h1>
      <ol className="mt-6 space-y-7">
        <Step n={1} done={screenOk} title="Pantalla en el proyector">
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant={screenOk ? "outline" : "default"}>
              <a href={sessionUrl(state.code, "screen")} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" /> Abrir pantalla
              </a>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => copy(sessionUrl(state.code, "screen"))}>
              <Copy className="size-4" /> Copiar enlace
            </Button>
            <span className="text-sm text-muted-foreground">{screenOk ? "Conectada." : "Ábrela en el portátil conectado al proyector y a los altavoces."}</span>
          </div>
        </Step>

        <Step n={2} done={micOk} title="Micrófono cerca del orador">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="shrink-0 rounded-xl bg-[#fff8ee] p-2">
              <QrCode value={micUrl} size={148} />
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                {state.clients.mic > 0
                  ? `${state.clients.mic} móvil conectado.`
                  : "Escanea el QR con un móvil y toca el botón de escuchar. Es el micrófono."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" onClick={() => copy(micUrl)}>
                  <Copy className="size-4" /> Copiar enlace
                </Button>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={micHere} onChange={(e) => setMicHere(e.target.checked)} />
                O usar el micrófono de este dispositivo
              </label>
            </div>
          </div>
        </Step>

        <Step n={3} done={gameOk} title="Juego y tema">
          <GamePicker state={state} onPatch={sendConfig} onAction={sendAction} />
        </Step>
      </ol>

      <div className="mt-10 flex flex-col items-center gap-3">
        <Button
          size="lg"
          className="h-16 w-full max-w-sm text-lg"
          disabled={!gameOk}
          onClick={() => sendAction({ type: "start" })}
        >
          <Play className="size-5" /> Empezar
        </Button>
        {!ready && gameOk && (
          <p className="text-center text-sm text-muted-foreground">
            Puedes empezar ya; {!screenOk && "la pantalla"}
            {!screenOk && !micOk && " y "}
            {!micOk && "el micrófono"} se pueden conectar después.
          </p>
        )}
      </div>
    </div>
  );
}

function Running({ state, interim, sendAction }: { state: SessionState; interim: string; sendAction: Send["sendAction"] }) {
  const mode = GAME_MODES.find((g) => g.id === state.mode);
  const last = state.decisions[0];
  const live = interim || state.transcript.at(-1)?.text || "";
  const mood = MOODS.find((m) => m.id === state.banda.mood);

  return (
    <div className="py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-success">● En marcha</div>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{mode?.title}</h1>
          {state.topic && <p className="text-muted-foreground">{state.topic}</p>}
        </div>
        <Button variant="secondary" size="lg" onClick={() => sendAction({ type: "stop" })}>
          <Pause className="size-4" /> Parar
        </Button>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Ahora en pantalla</div>
        <div className="mt-1 font-display text-2xl">
          {state.mode === "ilustrador" && `${state.canvas.elements.length} trazos · página ${state.canvas.page}`}
          {state.mode === "subtitulos" && (state.subtitles.current ? `«${state.subtitles.current.text}»` : "Sin subtítulo")}
          {state.mode === "banda" && `${mood?.emoji ?? ""} ${mood?.label ?? ""}`}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {state.mode === "ilustrador" && (
            <Button variant="outline" onClick={() => sendAction({ type: "new_page" })}>
              Página nueva
            </Button>
          )}
          {state.mode === "subtitulos" && (
            <>
              <Button onClick={() => sendAction({ type: "force_subtitle" })}>Lanzar un subtítulo</Button>
              <Button variant="outline" onClick={() => sendAction({ type: "clear_subtitle" })}>
                Quitar
              </Button>
            </>
          )}
          {state.mode === "banda" && (
            <>
              {MOODS.map((m) => (
                <Button key={m.id} size="sm" variant={state.banda.mood === m.id ? "default" : "outline"} onClick={() => sendAction({ type: "force_mood", mood: m.id })}>
                  {m.emoji} {m.label}
                </Button>
              ))}
              <Button size="sm" variant="ghost" onClick={() => sendAction({ type: "next_track" })}>
                <SkipForward className="size-4" /> Otra pista
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={() => sendAction({ type: "reset" })}>
            <RotateCcw className="size-4" /> Reiniciar ronda
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Se oye</div>
          <p className="mt-1 min-h-12 text-sm">{live || <span className="text-muted-foreground">Nada todavía. ¿Está el micro escuchando?</span>}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Decisión</div>
          <p className={cn("mt-1 min-h-12 text-sm", last?.outcome.startsWith("error") && "text-destructive")}>
            {last ? last.outcome : <span className="text-muted-foreground">Esperando la primera frase completa…</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
