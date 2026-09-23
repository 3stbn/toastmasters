/**
 * One Durable Object per game session (id = 4-letter code). It is the single
 * source of truth for the session state, fans it out to every connected
 * browser over WebSockets (screen / control / mic), runs the Jev evaluation
 * loop on incoming transcript, and uses alarms for time-based game steps.
 *
 * WebSockets use the hibernation API so an idle session costs nothing.
 */
import { DurableObject } from "cloudflare:workers";
import type { ClientAction, ClientMessage, ClientRole, ConfigPatch, ServerMessage } from "../../../shared/protocol";
import type { DecisionLog, SessionState, DecisionEngine } from "../../../shared/session";
import { MOOD_IDS } from "../../../shared/moods";
import { MUSIC } from "../../../shared/music";
import { drawTopics } from "../../../shared/topics";
import { ENGINES, newPage, setMood, showSubtitle } from "../services/games";
import { pickRandom } from "../services/games/types";
import { JevClient } from "../services/jev.service";
import {
  MAX_DECISIONS,
  MAX_ROUND_MS,
  MAX_TRANSCRIPT_SEGMENTS,
  SESSION_TTL_MS,
  newSessionState,
  resetLive,
} from "../services/session.service";
import { createLogger } from "../utils/logger";

const logger = createLogger("SessionDO");
const STATE_KEY = "state";
/** Minimum spacing between two Jev calls while speech keeps coming in. */
const EVAL_INTERVAL_MS = 600;
/** Interim text must grow this much (chars) to trigger a call on its own. */
const INTERIM_STEP_CHARS = 4;
const ROLES: ClientRole[] = ["screen", "control", "mic"];

interface Attachment {
  role: ClientRole;
}

export class SessionDO extends DurableObject<Cloudflare.Env> {
  private state: SessionState | null = null;
  private evalTimer: ReturnType<typeof setTimeout> | null = null;
  private evaluating = false;
  private dirty = false;
  private lastEvalAt = 0;
  private lastEvalText = "";
  private lastInterimLen = 0;
  private clients: Partial<Record<DecisionEngine, JevClient>> = {};

  // ---- lifecycle ---------------------------------------------------------

  private async load(): Promise<SessionState | null> {
    if (this.state) return this.state;
    const stored = await this.ctx.storage.get<SessionState>(STATE_KEY);
    if (stored) {
      this.state = stored;
      this.state.clients = this.countClients();
    }
    return this.state;
  }

  private async save(): Promise<void> {
    if (!this.state) return;
    await this.ctx.storage.put(STATE_KEY, this.state);
  }

  private countClients() {
    const counts = { screen: 0, control: 0, mic: 0 };
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() as Attachment | null;
      if (att?.role) counts[att.role]++;
    }
    return counts;
  }

  /** One client per engine. "local" falls back to Jev when the Worker has no LOCAL_JEV_URL. */
  private getClient(engine: DecisionEngine): { engine: DecisionEngine; client: JevClient } {
    if (engine === "local" && !this.env.LOCAL_JEV_URL) engine = "jev";
    let client = this.clients[engine];
    if (!client) {
      client =
        engine === "local"
          ? new JevClient({
              apiKey: this.env.LOCAL_JEV_KEY ?? "",
              baseUrl: this.env.LOCAL_JEV_URL,
              model: this.env.LOCAL_JEV_MODEL ?? "default",
              // A local 4B model answers in seconds, not milliseconds.
              timeoutMs: 15000,
            })
          : new JevClient({ apiKey: this.env.OPENROUTER_KEY, model: this.env.JEV_MODEL, timeoutMs: 4000 });
      this.clients[engine] = client;
    }
    return { engine, client };
  }

  // ---- HTTP entry points (called by the Worker) --------------------------

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const now = Date.now();

    if (url.pathname === "/create" && request.method === "POST") {
      const code = url.searchParams.get("code") ?? "";
      if (await this.load()) return Response.json({ created: false }, { status: 409 });
      this.state = newSessionState(code, now);
      await this.save();
      await this.scheduleAlarm();
      return Response.json({ created: true, state: this.state });
    }

    const state = await this.load();
    if (!state) return Response.json({ message: "Sesión no encontrada" }, { status: 404 });

    if (url.pathname === "/ws") {
      const role = url.searchParams.get("role") as ClientRole;
      if (!ROLES.includes(role)) return Response.json({ message: "role inválido" }, { status: 400 });
      if (request.headers.get("Upgrade") !== "websocket") {
        return Response.json({ message: "Se esperaba un WebSocket" }, { status: 426 });
      }
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({ role } satisfies Attachment);
      state.clients = this.countClients();
      this.send(server, { type: "state", state });
      this.broadcastState();
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === "/state" && request.method === "GET") {
      return Response.json(state);
    }
    if (url.pathname === "/config" && request.method === "PATCH") {
      const patch = (await request.json()) as ConfigPatch;
      await this.applyConfig(patch);
      return Response.json(this.state);
    }
    if (url.pathname === "/transcript" && request.method === "POST") {
      const body = (await request.json()) as { text: string; final: boolean };
      await this.onTranscript(body.text, body.final);
      return Response.json({ ok: true });
    }
    if (url.pathname === "/action" && request.method === "POST") {
      const action = (await request.json()) as ClientAction;
      await this.onAction(action);
      return Response.json(this.state);
    }
    if (url.pathname === "/evaluate" && request.method === "POST") {
      // Synchronous evaluation for tests/eval: waits for the Jev round-trip.
      await this.evaluate();
      return Response.json(this.state);
    }
    return Response.json({ message: "Not found" }, { status: 404 });
  }

  // ---- WebSocket handlers (hibernation API) ------------------------------

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (typeof raw !== "string") return;
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw) as ClientMessage;
    } catch {
      return this.send(ws, { type: "error", message: "JSON inválido" });
    }
    if (!(await this.load())) return this.send(ws, { type: "error", message: "Sesión no encontrada" });
    try {
      switch (msg.type) {
        case "ping":
          return this.send(ws, { type: "pong" });
        case "transcript":
          return await this.onTranscript(msg.text, msg.final);
        case "config":
          return await this.applyConfig(msg.patch);
        case "action":
          return await this.onAction(msg.action);
        case "screen":
          this.state!.screenSound = msg.sound;
          this.state!.screenLoaded = msg.loaded;
          this.broadcastState();
          return;
      }
    } catch (err) {
      logger.error("ws message failed", err);
      this.send(ws, { type: "error", message: (err as Error).message });
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    ws.close();
    await this.onClientsChanged();
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    ws.close();
    await this.onClientsChanged();
  }

  private async onClientsChanged() {
    const state = await this.load();
    if (!state) return;
    state.clients = this.countClients();
    this.broadcastState();
  }

  private send(ws: WebSocket, msg: ServerMessage) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      /* closed */
    }
  }

  private broadcast(msg: ServerMessage) {
    const data = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(data);
      } catch {
        /* closed */
      }
    }
  }

  private broadcastState() {
    if (this.state) this.broadcast({ type: "state", state: this.state });
  }

  private async commit() {
    await this.save();
    this.broadcastState();
    await this.scheduleAlarm();
  }

  // ---- game logic --------------------------------------------------------

  private async applyConfig(patch: ConfigPatch) {
    const s = this.state!;
    if (patch.mode !== undefined && patch.mode !== s.mode) {
      // Switching game clears live state so the screen starts clean.
      this.state = resetLive(s, Date.now());
      this.state.mode = patch.mode;
      this.state.topic = "";
      this.state.topicOptions = patch.mode ? drawTopics(patch.mode, this.state.usedTopics) : [];
    }
    const st = this.state!;
    if (typeof patch.topic === "string") {
      st.topic = patch.topic.slice(0, 200);
      if (st.topic && !st.usedTopics.includes(st.topic)) st.usedTopics = [...st.usedTopics, st.topic].slice(-60);
    }
    if (patch.settings) st.settings = { ...st.settings, ...patch.settings };
    if (Array.isArray(patch.behaviors)) st.behaviors = patch.behaviors;
    if (patch.settings?.engine === "local") this.warmEngine();
    await this.commit();
  }

  /** The local engine drops its model when idle; wake it before the round so the first call is fast. */
  private warmEngine() {
    if (this.state?.settings.engine !== "local" || !this.env.LOCAL_JEV_URL) return;
    this.ctx.waitUntil(this.getClient("local").client.warm());
  }

  private async onTranscript(text: string, final: boolean) {
    const s = this.state!;
    const clean = text.replace(/\s+/g, " ").trim();
    if (!final) {
      s.interim = clean;
      this.broadcast({ type: "interim", text: clean });
      // React while the sentence is still being spoken.
      if (s.running && s.mode && Math.abs(clean.length - this.lastInterimLen) >= INTERIM_STEP_CHARS) {
        this.lastInterimLen = clean.length;
        this.scheduleEvaluate();
      }
      return;
    }
    if (!clean) return;
    s.interim = "";
    this.lastInterimLen = 0;
    s.transcript.push({ text: clean, at: Date.now() });
    if (s.transcript.length > MAX_TRANSCRIPT_SEGMENTS) s.transcript.splice(0, s.transcript.length - MAX_TRANSCRIPT_SEGMENTS);
    await this.save();
    this.broadcastState();
    if (s.running && s.mode) this.scheduleEvaluate();
  }

  /** Throttle: one Jev call at most every EVAL_INTERVAL_MS, never two in flight. */
  private scheduleEvaluate() {
    if (this.evaluating) {
      this.dirty = true;
      return;
    }
    if (this.evalTimer) return;
    const wait = Math.max(0, EVAL_INTERVAL_MS - (Date.now() - this.lastEvalAt));
    this.evalTimer = setTimeout(() => {
      this.evalTimer = null;
      void this.evaluate();
    }, wait);
  }

  /** One Jev round-trip for the current mode, then apply the engine's decision. */
  private async evaluate(): Promise<void> {
    const s = this.state;
    if (!s || !s.running || !s.mode) return;
    if (this.evaluating) {
      this.dirty = true;
      return;
    }
    if (this.stopIfOvertime(Date.now())) {
      await this.commit();
      return;
    }
    this.evaluating = true;
    try {
      const engine = ENGINES[s.mode];
      const now = Date.now();
      const req = engine.buildRequest(s, now);
      if (!req || req.input === this.lastEvalText) return;
      this.lastEvalText = req.input;
      this.lastEvalAt = now;
      const started = Date.now();
      let log: DecisionLog;
      const { engine: used, client } = this.getClient(s.settings.engine ?? "jev");
      try {
        const res = await client.ask(req.state, req.questions);
        const applied = engine.apply(this.state!, res.answers, Date.now());
        this.state = applied.state;
        this.state.stats.jevCalls++;
        this.state.stats.jevCostUsd += res.usage?.cost ?? 0;
        log = {
          at: started,
          mode: s.mode,
          input: req.input,
          answers: res.answers,
          outcome: applied.outcome,
          latencyMs: Date.now() - started,
          costUsd: res.usage?.cost ?? 0,
          engine: used,
        };
      } catch (err) {
        const message = (err as Error).message;
        logger.error("Jev call failed", err);
        this.state!.stats.jevErrors++;
        this.state!.stats.lastError = message;
        log = { at: started, mode: s.mode, input: req.input, answers: {}, outcome: `error: ${message}`, latencyMs: Date.now() - started, costUsd: 0, engine: used };
      }
      this.state!.decisions = [log, ...this.state!.decisions].slice(0, MAX_DECISIONS);
      await this.commit();
    } finally {
      this.evaluating = false;
      if (this.dirty) {
        this.dirty = false;
        this.scheduleEvaluate();
      }
    }
  }

  /** Rounds end by themselves after MAX_ROUND_MS: a forgotten Empezar must not keep paying for evaluations. */
  private stopIfOvertime(now: number): boolean {
    const s = this.state;
    if (!s || !s.running) return false;
    // Sessions stored before this field existed: count from now.
    if (!s.runningSince) {
      s.runningSince = now;
      return false;
    }
    if (now - s.runningSince < MAX_ROUND_MS) return false;
    s.running = false;
    s.runningSince = 0;
    s.decisions = [
      {
        at: now,
        mode: s.mode ?? "subtitulos",
        input: "",
        answers: {},
        outcome: `ronda parada automáticamente a los ${Math.round(MAX_ROUND_MS / 60000)} min`,
        latencyMs: 0,
        costUsd: 0,
      },
      ...s.decisions,
    ].slice(0, MAX_DECISIONS);
    logger.info(`Session ${s.code}: round auto-stopped`);
    return true;
  }

  private async onAction(action: ClientAction) {
    const s = this.state!;
    const now = Date.now();
    switch (action.type) {
      case "start":
        s.running = true;
        s.runningSince = now;
        // The cadence rule counts from here, not from the epoch.
        if (!s.subtitles.lastShownAt) s.subtitles.lastShownAt = now;
        this.warmEngine();
        break;
      case "stop":
        s.running = false;
        s.runningSince = 0;
        break;
      case "reset":
        this.state = resetLive(s, now);
        break;
      case "new_page":
        this.state = newPage(s);
        break;
      case "turn_around":
        s.canvas.cueAt = now;
        break;
      case "test_sound":
        s.soundTestAt = now;
        break;
      case "clear_subtitle":
        s.subtitles.current = null;
        break;
      case "force_subtitle": {
        const b = s.behaviors.find((x) => x.id === action.behaviorId) ?? pickRandom(s.behaviors);
        const text = action.text?.trim() || pickRandom(b.phrases, s.subtitles.lastPhraseByBehavior[b.id]);
        this.state = showSubtitle(s, b.id, text, null, now);
        break;
      }
      case "force_mood":
        if (MOOD_IDS.includes(action.mood)) this.state = setMood(s, action.mood, now);
        break;
      case "shuffle_topics":
        if (s.mode) {
          s.topic = "";
          s.topicOptions = drawTopics(s.mode, [...s.usedTopics, ...s.topicOptions]);
        }
        break;
      case "next_track": {
        const n = (MUSIC[s.banda.mood] ?? []).length;
        if (n > 0) s.banda.trackIndex = (s.banda.trackIndex + 1) % n;
        break;
      }
    }
    await this.commit();
  }

  // ---- alarms: time-based steps + idle cleanup ---------------------------

  private async scheduleAlarm() {
    const s = this.state;
    if (!s) return;
    const now = Date.now();
    const idleAt = now + SESSION_TTL_MS;
    let next = idleAt;
    if (s.running && s.mode) {
      const t = ENGINES[s.mode].nextTickAt?.(s, now);
      if (t !== null && t !== undefined) next = Math.min(next, Math.max(t, now + 250));
    }
    if (s.running) next = Math.min(next, Math.max((s.runningSince || now) + MAX_ROUND_MS, now + 250));
    await this.ctx.storage.setAlarm(next);
  }

  async alarm(): Promise<void> {
    const s = await this.load();
    if (!s) return;
    const now = Date.now();
    const lastActivity = s.transcript.at(-1)?.at ?? s.createdAt;
    if (now - lastActivity > SESSION_TTL_MS && this.countClients().screen + this.countClients().control + this.countClients().mic === 0) {
      logger.info(`Session ${s.code} expired`);
      await this.ctx.storage.deleteAll();
      this.state = null;
      return;
    }
    this.stopIfOvertime(now);
    if (s.running && s.mode) {
      const result = ENGINES[s.mode].tick?.(s, now);
      if (result) {
        this.state = result.state;
        this.state.decisions = [
          { at: now, mode: s.mode, input: "", answers: {}, outcome: result.outcome, latencyMs: 0, costUsd: 0 },
          ...this.state.decisions,
        ].slice(0, MAX_DECISIONS);
      }
    }
    await this.commit();
  }
}
