/**
 * Self-evaluation of the three games against Jev, using the SAME question
 * builders and decision logic the Durable Object runs, over scripted Spanish
 * transcripts with known intent. Prints per-case verdicts, a score, and the
 * raw probabilities so thresholds can be tuned with evidence.
 *
 *   pnpm eval                # all games, against Jev (OpenRouter)
 *   pnpm eval banda          # one game
 *   ENGINE=local pnpm eval   # same cases against the SemIf service (LOCAL_JEV_URL / LOCAL_JEV_KEY in ../.env)
 *   ENGINE=local LOCAL_JEV_MODEL=Qwen/Qwen3.5-2B pnpm eval   # pick a loaded model
 *
 * Needs OPENROUTER_KEY in ../.env (or the environment).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_BEHAVIORS } from "../../shared/phrases";
import { DEFAULT_MOOD, MOODS } from "../../shared/moods";
import type { SessionState } from "../../shared/session";
import { bandaEngine } from "../src/services/games/banda";
import { ilustradorEngine } from "../src/services/games/ilustrador";
import { subtitulosEngine } from "../src/services/games/subtitulos";
import { JevClient, type ChoiceAnswer, type NoulAnswer, type ScoreAnswer } from "../src/services/jev.service";
import { newSessionState } from "../src/services/session.service";

// --- env ---------------------------------------------------------------------
const envFile = resolve(import.meta.dirname, "../../.env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^(OPENROUTER_KEY|LOCAL_JEV_URL|LOCAL_JEV_KEY|LOCAL_JEV_MODEL)=(.+)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
const ENGINE = process.env.ENGINE === "local" ? "local" : "jev";
if (ENGINE === "jev" && !process.env.OPENROUTER_KEY) {
  console.error("OPENROUTER_KEY missing");
  process.exit(1);
}
if (ENGINE === "local" && !process.env.LOCAL_JEV_URL) {
  console.error("LOCAL_JEV_URL missing");
  process.exit(1);
}
const jev =
  ENGINE === "local"
    ? new JevClient({ apiKey: process.env.LOCAL_JEV_KEY ?? "", baseUrl: process.env.LOCAL_JEV_URL, model: process.env.LOCAL_JEV_MODEL ?? "default", timeoutMs: 60000 })
    : new JevClient({ apiKey: process.env.OPENROUTER_KEY!, timeoutMs: 15000 });
console.log(`motor: ${ENGINE === "local" ? `local ${process.env.LOCAL_JEV_MODEL ?? "(default)"} @ ${process.env.LOCAL_JEV_URL}` : "jev-latest @ openrouter"}`);
if (ENGINE === "local") {
  // The service loads its model on demand (~20 s); wake it and wait so latencies are steady-state.
  await jev.warm();
  const health = process.env.LOCAL_JEV_URL!.replace(/\/v1\/?$/, "/health");
  for (let i = 0; i < 40; i++) {
    const h = (await fetch(health).then((r) => r.json()).catch(() => null)) as { loaded?: string[] } | null;
    if (h?.loaded?.length) break;
    if (i === 0) console.log("cargando el modelo local…");
    await new Promise((r) => setTimeout(r, 1500));
  }
}
const only = process.argv[2];

// --- helpers -----------------------------------------------------------------
function session(topic: string, mode: SessionState["mode"]): SessionState {
  const s = newSessionState("EVAL", Date.now());
  s.mode = mode;
  s.topic = topic;
  s.running = true;
  return s;
}

function withTranscript(s: SessionState, segments: string[], now: number): SessionState {
  // Spread the segments over the last ~30 s so "recent" windows behave as live.
  const gap = 4000;
  return {
    ...s,
    transcript: segments.map((text, i) => ({ text, at: now - (segments.length - 1 - i) * gap })),
  };
}

let totalCost = 0;
let totalCalls = 0;
const latencies: number[] = [];
async function ask(state: Parameters<JevClient["ask"]>[0], questions: Parameters<JevClient["ask"]>[1]) {
  const t0 = Date.now();
  const res = await jev.ask(state, questions);
  latencies.push(Date.now() - t0);
  totalCalls++;
  totalCost += res.usage?.cost ?? 0;
  return res;
}
const pass: string[] = [];
const fail: string[] = [];

function verdict(ok: boolean, label: string, detail: string) {
  (ok ? pass : fail).push(label);
  console.log(`  ${ok ? "✅" : "❌"} ${label}\n     ${detail}`);
}

// --- 1. Subtítulos de la verdad ----------------------------------------------
const SUBTITLE_CASES: { name: string; topic: string; earlier: string[]; recent: string[]; expect: string[]; forbid?: string[] }[] = [
  {
    name: "haciendo tiempo puro",
    topic: "Mi peor viaje en avión",
    earlier: [],
    recent: [
      "Bueno eh el tema es mi peor viaje en avión y bueno es un tema muy interesante la verdad",
      "eh como decía es un tema muy muy importante y bueno hay muchas cosas que decir sobre esto",
    ],
    expect: ["haciendo_tiempo"],
    forbid: ["concluyendo", "anecdota_personal"],
  },
  {
    name: "cambio de tema descarado",
    topic: "Mi peor viaje en avión",
    earlier: ["El avión salía a las seis de la mañana y yo llegué tarde al aeropuerto"],
    recent: [
      "pero hablando de otra cosa el otro día vi un partido de fútbol increíble",
      "el Madrid jugó fatal en la segunda parte y el árbitro no pitó un penalti clarísimo",
    ],
    expect: ["cambio_tema"],
    forbid: ["haciendo_tiempo"],
  },
  {
    name: "exageración",
    topic: "Mi peor viaje en avión",
    earlier: [],
    recent: [
      "el avión se movió tanto que literalmente estuvimos del revés durante veinte minutos",
      "era la peor turbulencia de la historia de la humanidad y todo el mundo lloraba a gritos",
    ],
    expect: ["exagerando"],
    forbid: ["haciendo_tiempo"],
  },
  {
    name: "concluyendo",
    topic: "Mi peor viaje en avión",
    earlier: ["Salimos con retraso y perdí la conexión en Madrid"],
    recent: [
      "así que en resumen aprendí que hay que llegar siempre con tiempo al aeropuerto",
      "y para terminar les diría que lo importante es reírse de estas cosas muchas gracias",
    ],
    expect: ["concluyendo"],
    forbid: ["haciendo_tiempo", "cambio_tema"],
  },
  {
    name: "datos inventados",
    topic: "Por qué los lunes deberían ser ilegales",
    earlier: [],
    recent: [
      "según un estudio de la universidad de Harvard el ochenta y siete por ciento de los infartos ocurren los lunes",
      "y la ONU calcula que cada lunes se pierden tres millones de horas de productividad solo en España",
    ],
    expect: ["inventando_datos"],
  },
  {
    name: "anécdota personal (desvío)",
    topic: "El futuro del transporte",
    earlier: [],
    recent: [
      "cuando yo era pequeño mi abuela me llevaba a la piscina del pueblo todos los veranos",
      "y una vez mi primo me empujó al agua y ahí fue cuando aprendí a nadar del susto",
    ],
    expect: ["anecdota_personal", "cambio_tema", "familia"],
    forbid: ["haciendo_tiempo"],
  },
  {
    name: "comida",
    topic: "Mi comida favorita",
    earlier: [],
    recent: ["bueno la verdad es que no me gusta nada la pizza nunca la como prefiero mil veces la ensalada"],
    expect: ["comida"],
  },
  {
    name: "contenido normal (no debería disparar nada)",
    topic: "Mi peor viaje en avión",
    earlier: [],
    recent: [
      "el vuelo salía de Barcelona a las ocho de la mañana con destino a Roma",
      "facturé la maleta pasé el control y me senté en la puerta de embarque a esperar",
    ],
    expect: [],
    forbid: ["haciendo_tiempo", "exagerando", "cambio_tema", "concluyendo", "inventando_datos"],
  },
];

async function evalSubtitulos() {
  console.log("\n=== Subtítulos de la verdad ===");
  const now = Date.now();
  const hits: Record<string, number[]> = {};
  for (const c of SUBTITLE_CASES) {
    const base = session(c.topic, "subtitulos");
    const st = withTranscript(base, [...c.earlier, ...c.recent], now);
    // Make "earlier" segments old enough to fall outside the recent window.
    st.transcript = st.transcript.map((seg, i) => (i < c.earlier.length ? { ...seg, at: now - 60_000 - (c.earlier.length - i) * 4000 } : seg));
    const req = subtitulosEngine.buildRequest(st, now)!;
    const res = await ask(req.state, req.questions);
    const probs = Object.fromEntries(Object.entries(res.answers).map(([k, a]) => [k, (a as NoulAnswer).noul]));
    for (const [k, p] of Object.entries(probs)) (hits[k] ??= []).push(p);
    const applied = subtitulosEngine.apply(st, res.answers, now);
    const shown = applied.state.subtitles.current?.behaviorId ?? null;
    const top = Object.entries(probs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([k, p]) => `${k}=${p.toFixed(2)}`)
      .join("  ");
    const expectedHit = c.expect.length === 0 ? shown === null : c.expect.includes(shown ?? "");
    const forbidHit = (c.forbid ?? [])
      .filter((f) => f in probs)
      .some((f) => probs[f] >= (DEFAULT_BEHAVIORS.find((b) => b.id === f)?.threshold ?? st.settings.subtitleThreshold));
    verdict(expectedHit && !forbidHit, c.name, `mostrado: ${shown ?? "—"} · esperado: ${c.expect.join("|") || "nada"} · ${top}`);
  }
  console.log("\n  Media de probabilidad por comportamiento (todas las pruebas):");
  for (const [k, v] of Object.entries(hits)) {
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    console.log(`    ${k.padEnd(20)} media ${mean.toFixed(2)}  max ${Math.max(...v).toFixed(2)}`);
  }
}

// --- 2. Banda sonora --------------------------------------------------------
const MOOD_CASES: { name: string; topic: string; recent: string[]; expect: string[] }[] = [
  {
    name: "épico",
    topic: "El día que aprendí a nadar",
    recent: [
      "y en ese momento supe que no iba a rendirme jamás me lancé al agua con todas mis fuerzas",
      "luché contra las olas como un guerrero y cuando toqué la orilla todo el pueblo aplaudió de pie",
    ],
    expect: ["epico"],
  },
  {
    name: "drama",
    topic: "Mi abuelo",
    recent: [
      "mi abuelo me enseñó a pescar en ese río y el último verano ya no podía sostener la caña",
      "no pude despedirme de él y todavía hoy cuando paso por el río me quedo sin palabras",
    ],
    expect: ["drama"],
  },
  {
    name: "suspense",
    topic: "Una noche en la oficina",
    recent: [
      "eran las once de la noche y de repente se apagaron todas las luces del edificio",
      "oí pasos en el pasillo alguien se acercaba despacio y yo no tenía a dónde ir",
    ],
    expect: ["suspense", "terror"],
  },
  {
    name: "romántico",
    topic: "Cómo conocí a mi pareja",
    recent: [
      "la vi por primera vez en la cola del supermercado y se me olvidó hasta lo que iba a comprar",
      "le pregunté si el aguacate estaba maduro y esa fue la primera de mil conversaciones",
    ],
    expect: ["romantico"],
  },
  {
    name: "comedia",
    topic: "Mi peor cita",
    recent: [
      "llegué al restaurante con la camisa al revés y no me di cuenta hasta el postre",
      "el camarero me lo dijo delante de ella y yo hice como que era una tendencia de moda",
    ],
    expect: ["comedia"],
  },
  {
    name: "telenovela",
    topic: "Secretos de familia",
    recent: [
      "y entonces mi tía entró en la boda gritando que el novio era en realidad su hijo perdido",
      "mi madre se desmayó mi padre rompió la copa y yo supe que nadie en esta familia me había dicho la verdad",
    ],
    expect: ["telenovela", "drama"],
  },
  {
    name: "neutro / informativo",
    topic: "Cómo funciona un club Toastmasters",
    recent: [
      "cada reunión tiene un moderador un evaluador y un contador de tiempo",
      "los discursos preparados duran entre cinco y siete minutos y luego hay evaluaciones",
    ],
    expect: ["neutro"],
  },
];

async function evalBanda() {
  console.log("\n=== Banda sonora ===");
  const now = Date.now();
  for (const c of MOOD_CASES) {
    const st = withTranscript(session(c.topic, "banda"), c.recent, now);
    const req = bandaEngine.buildRequest(st, now)!;
    const res = await ask(req.state, req.questions);
    const a = res.answers.mood as ChoiceAnswer;
    const ranked = Object.entries(a.probabilities)
      .sort((x, y) => y[1] - x[1])
      .slice(0, 3)
      .map(([k, p]) => `${k}=${Math.round(p * 100)}%`)
      .join("  ");
    // Would the hysteresis actually switch from neutro after two consistent readings?
    let s2 = { ...st, banda: { ...st.banda, since: now - 60_000 } };
    s2 = bandaEngine.apply(s2, res.answers, now).state;
    s2 = bandaEngine.apply(s2, res.answers, now + 5000).state;
    const switched = s2.banda.mood;
    const ok = c.expect.includes(a.choice) && (c.expect.includes(switched) || (c.expect[0] === DEFAULT_MOOD && switched === DEFAULT_MOOD));
    verdict(ok, c.name, `Jev: ${a.choice} (conf ${a.confidence.toFixed(2)}) → tras 2 lecturas: ${switched} · ${ranked}`);
  }
}

// --- 3. Ilustrador automático ------------------------------------------------
const DOODLE_CASES: { name: string; topic: string; recent: string[]; expect: string[] }[] = [
  { name: "perro en la playa", topic: "Mi mejor verano", recent: ["el otro día mi perro se escapó corriendo por toda la playa"], expect: ["Dog", "Waves", "Palmtree", "PawPrint"] },
  { name: "pizza con amigos", topic: "Una comida inolvidable", recent: ["nos pedimos tres pizzas gigantes y las cervezas se calentaron"], expect: ["Pizza", "Beer", "Utensils"] },
  { name: "perdí el avión", topic: "Mi peor viaje", recent: ["llegué corriendo al aeropuerto y el avión ya había despegado"], expect: ["Plane", "Clock", "Footprints", "Hourglass"] },
  { name: "enamorado", topic: "Cómo conocí a mi pareja", recent: ["y en ese momento supe que me había enamorado para siempre"], expect: ["Heart", "Sparkles", "Smile"] },
  { name: "examen", topic: "Mi época de estudiante", recent: ["la noche antes del examen no dormí nada estudiando con café"], expect: ["GraduationCap", "Book", "Coffee", "Moon", "Bed"] },
];

async function evalIlustrador() {
  console.log("\n=== Ilustrador automático ===");
  const now = Date.now();
  for (const c of DOODLE_CASES) {
    const st = withTranscript(session(c.topic, "ilustrador"), c.recent, now);
    const req = ilustradorEngine.buildRequest(st, now)!;
    const res = await ask(req.state, req.questions);
    const pick = res.answers.doodle as ChoiceAnswer;
    const marker = res.answers.marker as ChoiceAnswer;
    const emphasis = res.answers.emphasis as ScoreAnswer;
    // Two consistent readings, as in a live session.
    let applied = ilustradorEngine.apply(st, res.answers, now);
    applied = ilustradorEngine.apply(applied.state, res.answers, now + 700);
    const drawn = applied.state.canvas.elements.at(-1);
    const ranked = Object.entries(pick.probabilities)
      .sort((x, y) => y[1] - x[1])
      .slice(0, 3)
      .map(([k, p]) => `${k}=${Math.round(p * 100)}%`)
      .join("  ");
    verdict(!!drawn && c.expect.includes(drawn.ref), c.name, `${drawn ? "dibuja " + drawn.label + " (" + drawn.ref + ")" : "no dibuja"} · ${marker.choice} · énfasis ${emphasis.score.toFixed(1)} · ${ranked}`);
  }
}

// --- run --------------------------------------------------------------------
(async () => {
  const started = Date.now();
  if (!only || only === "subtitulos") await evalSubtitulos();
  if (!only || only === "banda") await evalBanda();
  if (!only || only === "ilustrador") await evalIlustrador();
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? 0;
  const avg = sorted.length ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0;
  console.log(
    `\n${pass.length}/${pass.length + fail.length} pruebas OK · ${totalCalls} llamadas (${ENGINE}) · latencia media ${avg} ms, p50 ${p50} ms, p90 ${p90} ms · $${totalCost.toFixed(4)} · ${((Date.now() - started) / 1000).toFixed(1)}s`,
  );
  if (fail.length) console.log("Fallos: " + fail.join(" | "));
  console.log(`Moods: ${MOODS.map((m) => m.id).join(", ")}`);
  process.exit(fail.length ? 1 : 0);
})();
