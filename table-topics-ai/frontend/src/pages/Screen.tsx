/**
 * The projector page. Full-bleed, dark, loud. It is the only client that
 * plays audio. On load it preloads every music track into memory and reports
 * progress to the session (the phone waits for it). Browsers need one user
 * gesture before sound can play, so any click or key on this page unlocks
 * it (and goes fullscreen); until then the page still shows the code and QR.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearch } from "wouter";
import { Volume2 } from "lucide-react";
import { GAME_MODES } from "@shared/session";
import { MUSIC } from "@shared/music";
import { useNow, useSession } from "@/hooks/useSession";
import { useWakeLock } from "@/hooks/useWakeLock";
import { MusicPlayer, audioUnlocked, chime, speak, unlockAudio } from "@/lib/audio";
import { MicControl } from "@/components/MicControl";
import { IlustradorView } from "@/components/screen/IlustradorView";
import { SubtitlesView } from "@/components/screen/SubtitlesView";
import { BandaView } from "@/components/screen/BandaView";
import { WaitingView } from "@/components/screen/WaitingView";
import { Stage } from "@/components/screen/Stage";
import { SessionMissing } from "./SessionMissing";

const ALL_TRACKS = Object.values(MUSIC).flatMap((tracks) => tracks.map((t) => `/music/${t.file}`));

export function Screen() {
  const { code = "" } = useParams<{ code: string }>();
  const search = useSearch();
  const upper = code.toUpperCase();
  const { state, interim, status, send, sendTranscript } = useSession(upper, "screen");
  const now = useNow(250);
  const params = new URLSearchParams(search);
  const micHere = params.get("mic") === "1";
  const [armed, setArmed] = useState(params.get("nosound") === "1");
  const [loaded, setLoaded] = useState(0);
  const player = useMemo(() => new MusicPlayer(), []);
  // A phone used as the display must not go to sleep either.
  useWakeLock(armed);
  const [portrait, setPortrait] = useState(window.innerHeight > window.innerWidth);
  useEffect(() => {
    const onResize = () => setPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const lastTestAt = useRef<number | null>(null);
  const [missing, setMissing] = useState(0);

  // Preload all music once, right away.
  useEffect(() => {
    void player.preload(ALL_TRACKS, setLoaded).then(() => setMissing(player.missing.size));
  }, [player]);

  // The phone asked for a sound check.
  useEffect(() => {
    const at = state?.soundTestAt ?? 0;
    if (lastTestAt.current !== null && at !== lastTestAt.current && at > 0) {
      chime();
      setTimeout(() => speak("Sonido activado", "es-ES"), 600);
    }
    lastTestAt.current = at;
  }, [state?.soundTestAt]);

  // One gesture anywhere unlocks audio + fullscreen.
  useEffect(() => {
    if (armed) return;
    const arm = async () => {
      await unlockAudio();
      setArmed(true);
      document.documentElement.requestFullscreen?.().catch(() => {});
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return;
      void arm();
    };
    window.addEventListener("pointerdown", arm, { once: true });
    window.addEventListener("keydown", onKey, { once: true });
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", onKey);
    };
  }, [armed]);

  // Tell the session (and the phone) whether this screen can make sound and how loaded it is.
  useEffect(() => {
    if (status === "open") send({ type: "screen", sound: armed && audioUnlocked(), loaded });
  }, [armed, loaded, status, send]);

  // Mood changed → crossfade music. Music only plays in "banda" while running.
  useEffect(() => {
    if (!state || !audioUnlocked()) return;
    player.setVolume(state.settings.musicVolume);
    if (state.mode !== "banda" || !state.running) {
      player.stop();
      return;
    }
    const tracks = MUSIC[state.banda.mood] ?? [];
    const track = tracks[state.banda.trackIndex % Math.max(1, tracks.length)];
    if (track) {
      const others = tracks.filter((t) => t !== track).map((t) => `/music/${t.file}`);
      player.play(`/music/${track.file}`, [...others, ...ALL_TRACKS]);
    }
  }, [armed, loaded, state?.mode, state?.running, state?.banda.mood, state?.banda.trackIndex, state?.settings.musicVolume, player, state]);

  useEffect(() => () => player.stop(0), [player]);

  if (status === "missing") return <SessionMissing code={upper} />;

  const modeTitle = state?.mode ? GAME_MODES.find((g) => g.id === state.mode)?.title : null;
  const light = !!state?.running && state.mode === "ilustrador";

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-black text-foreground select-none">
      {state && state.running && state.mode === "ilustrador" && (
        <Stage bg="#f6f1e6">
          <IlustradorView state={state} interim={interim} />
        </Stage>
      )}
      {state && state.running && state.mode === "subtitulos" && (
        <Stage bg="oklch(0.1 0.01 55)">
          <SubtitlesView state={state} interim={interim} now={now} />
        </Stage>
      )}
      {state && state.running && state.mode === "banda" && (
        <Stage bg="#0b0908">
          <BandaView state={state} interim={interim} />
        </Stage>
      )}
      {state && (!state.running || !state.mode) && (
        <Stage bg="oklch(0.12 0.01 55)">
          <WaitingView state={state} status={status} soundReady={armed} loaded={loaded} />
        </Stage>
      )}

      <div className={`pointer-events-none absolute top-0 right-0 left-0 flex items-start justify-between p-5 font-mono text-xs tracking-[0.3em] ${light ? "text-neutral-500" : "text-white/60"}`}>
        <div className="uppercase">{modeTitle ?? "Habla y verás"}</div>
        <div className="flex items-center gap-4">
          {!armed && <span className="text-warning">sin sonido · haz clic</span>}
          {loaded < 1 && <span className="text-warning">música {Math.round(loaded * 100)} %</span>}
          {missing > 0 && <span className="text-warning">{missing} pistas sin cargar</span>}
          {state && state.clients.mic === 0 && !micHere && <span className="text-warning">sin micro</span>}
          <span className={status === "open" ? "" : "text-destructive"}>{upper}</span>
        </div>
      </div>

      {portrait && (
        <div className="pointer-events-none absolute inset-x-0 top-14 z-10 text-center font-mono text-xs tracking-[0.3em] text-warning uppercase">
          gira el dispositivo
        </div>
      )}

      {!armed && state && !state.running && (
        <button
          type="button"
          className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-primary/60 bg-black/60 px-6 py-3 text-base text-primary backdrop-blur hover:bg-primary hover:text-primary-foreground"
        >
          <Volume2 className="size-5" /> Haz clic para activar el sonido y la pantalla completa
        </button>
      )}

      {armed && micHere && (
        <div className="absolute bottom-4 left-4 z-10 w-72 rounded-xl border border-white/10 bg-black/70 p-3 backdrop-blur">
          <MicControl lang={state?.settings.lang ?? "es-ES"} connected={status === "open"} sendTranscript={sendTranscript} autoStart />
        </div>
      )}
    </div>
  );
}
