/**
 * The phone: microphone + remote control. Pick the game and topic, start,
 * stop, and nudge the round (new page, turn-around cue, another track).
 * Fine tuning lives on /control, linked at the bottom.
 */
import { Link, useParams } from "wouter";
import { Eraser, Pause, Play, RotateCcw, RotateCw, SkipForward, Volume2 } from "lucide-react";
import { MOODS } from "@shared/moods";
import { GAME_MODES, MAX_ROUND_MINUTES } from "@shared/session";
import { useSession } from "@/hooks/useSession";
import { GamePicker } from "@/components/GamePicker";
import { MicControl } from "@/components/MicControl";
import { StatusBar } from "@/components/StatusBar";
import { Button } from "@/components/ui/button";
import { SessionMissing } from "./SessionMissing";

export function Mic() {
  const { code = "" } = useParams<{ code: string }>();
  const upper = code.toUpperCase();
  const { state, interim, status, sendAction, sendConfig, sendTranscript } = useSession(upper, "mic");

  if (status === "missing") return <SessionMissing code={upper} />;
  const mode = state?.mode ? GAME_MODES.find((g) => g.id === state.mode) : null;
  const mood = state ? MOODS.find((m) => m.id === state.banda.mood) : null;
  const screenReady = !!state && state.clients.screen > 0 && state.screenLoaded >= 1;
  const canStart = !!state?.mode && !!state.topic && (screenReady || state.clients.screen === 0);
  const lastDoodle = state?.canvas.elements.at(-1);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-safe pb-safe">
      <div className="pt-4">
        <StatusBar state={state} status={status} title="Micrófono" />
      </div>

      {!state ? (
        <p className="py-16 text-center text-muted-foreground">Conectando…</p>
      ) : (
        <div className="flex-1 space-y-6 py-6">
          <MicControl lang={state.settings.lang} connected={status === "open"} sendTranscript={sendTranscript} hero />

          {state.running ? (
            <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-success">● En marcha</div>
                  <div className="font-display text-xl font-semibold">{mode?.title}</div>
                  <div className="text-sm text-muted-foreground">{state.topic}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">Se para sola a los {MAX_ROUND_MINUTES} min.</div>
                </div>
                <Button variant="secondary" onClick={() => sendAction({ type: "stop" })}>
                  <Pause className="size-4" /> Parar
                </Button>
              </div>
              <div className="rounded-xl bg-background/50 p-3">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">En pantalla</div>
                <div className="font-display text-lg">
                  {state.mode === "ilustrador" && (lastDoodle ? `${lastDoodle.label} · ${state.canvas.elements.length} trazos, página ${state.canvas.page}` : "Pizarra en blanco")}
                  {state.mode === "subtitulos" && (state.subtitles.current ? `«${state.subtitles.current.text}»` : "Escuchando…")}
                  {state.mode === "banda" && `${mood?.emoji ?? ""} ${mood?.label ?? ""}`}
                </div>
                {interim && <div className="mt-1 truncate text-xs text-muted-foreground italic">{interim}</div>}
              </div>
              <div className="flex flex-wrap gap-2">
                {state.mode === "ilustrador" && (
                  <>
                    <Button onClick={() => sendAction({ type: "turn_around" })}>
                      <RotateCw className="size-4" /> ¡Que se dé la vuelta!
                    </Button>
                    <Button variant="outline" onClick={() => sendAction({ type: "new_page" })}>
                      <Eraser className="size-4" /> Página nueva
                    </Button>
                  </>
                )}
                {state.mode === "subtitulos" && <Button onClick={() => sendAction({ type: "force_subtitle" })}>Lanzar un subtítulo</Button>}
                {state.mode === "banda" && (
                  <Button onClick={() => sendAction({ type: "next_track" })}>
                    <SkipForward className="size-4" /> Otra pista
                  </Button>
                )}
                <Button variant="ghost" onClick={() => sendAction({ type: "reset" })}>
                  <RotateCcw className="size-4" /> Reiniciar
                </Button>
              </div>
            </section>
          ) : (
            <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
              <div className="font-semibold">Juego y tema</div>
              <GamePicker state={state} onPatch={sendConfig} onAction={sendAction} />
              <Button size="lg" className="h-14 w-full text-base" disabled={!canStart} onClick={() => sendAction({ type: "start" })}>
                <Play className="size-5" /> Empezar
              </Button>
              <Button variant="outline" className="w-full" disabled={state.clients.screen === 0} onClick={() => sendAction({ type: "test_sound" })}>
                <Volume2 className="size-4" /> Probar sonido en la pantalla
              </Button>
              {state.clients.screen === 0 ? (
                <p className="text-center text-xs text-warning">La pantalla del proyector aún no está conectada.</p>
              ) : state.screenLoaded < 1 ? (
                <p className="text-center text-xs text-warning">La pantalla está cargando la música… {Math.round(state.screenLoaded * 100)} %</p>
              ) : !state.screenSound ? (
                <p className="text-center text-xs text-warning">Haz clic en la pantalla del proyector para activar el sonido.</p>
              ) : null}
            </section>
          )}
        </div>
      )}

      <footer className="flex items-center justify-between py-4 text-xs text-muted-foreground">
        <span>Deja el móvil cerca del orador, con la pantalla encendida.</span>
        <Link href={`/s/${upper}/control`} className="hover:text-foreground">
          Ajustes
        </Link>
      </footer>
    </main>
  );
}
