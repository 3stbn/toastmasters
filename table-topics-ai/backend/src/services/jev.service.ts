/**
 * TypeSafe Jev ("System One") client, called through OpenRouter.
 *
 *   POST https://openrouter.ai/api/v1/systemone
 *   { model, state, questions: { id: {type: noul|choice|score, instructions, criteria} } }
 *
 * Jev does not generate text: every question comes back as a probability
 * (noul), a pick with a probability distribution and a confidence (choice),
 * or a level on a rubric (score). Docs: https://docs.typesafe.ai
 *
 * Kept free of Cloudflare types so the eval script can run it under Node.
 */

export type JevState = string | Record<string, unknown> | unknown[];

export interface NoulQuestion {
  type: "noul";
  instructions: string | Record<string, unknown>;
  criteria?: { true: string; false: string };
}
export interface ChoiceQuestion {
  type: "choice";
  instructions: string | Record<string, unknown>;
  criteria: Record<string, string | Record<string, unknown>>;
}
export interface ScoreQuestion {
  type: "score";
  instructions: string | Record<string, unknown>;
  criteria: (string | Record<string, unknown>)[];
}
export type JevQuestion = NoulQuestion | ChoiceQuestion | ScoreQuestion;

export interface NoulAnswer {
  type: "noul";
  noul: number;
}
export interface ChoiceAnswer {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}
export interface ScoreAnswer {
  type: "score";
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  confidence: number;
}
export type JevAnswer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

export interface JevResponse {
  id: string;
  model: string;
  answers: Record<string, JevAnswer>;
  usage: { input_tokens: number; output_tokens: number; cost?: number };
}

export interface JevClientOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export class JevError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
  ) {
    super(message);
  }
}

export class JevClient {
  private readonly model: string;
  private readonly url: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(private readonly opts: JevClientOptions) {
    this.model = opts.model ?? "jev-latest";
    this.url = (opts.baseUrl ?? "https://openrouter.ai/api/v1") + "/systemone";
    this.timeoutMs = opts.timeoutMs ?? 8000;
    // Wrap rather than store: calling an unbound `fetch` throws "Illegal invocation" in Workers.
    this.fetchFn = opts.fetch ?? ((input, init) => fetch(input, init));
  }

  /**
   * One round-trip. Retries once on 429/5xx with a short backoff, which is
   * what the TypeSafe docs recommend; anything else throws JevError.
   */
  async ask<Q extends Record<string, JevQuestion>>(
    state: JevState,
    questions: Q,
  ): Promise<JevResponse & { answers: { [K in keyof Q]: AnswerFor<Q[K]> } }> {
    let lastErr: JevError | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
      try {
        const res = await this.fetchFn(this.url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.opts.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/3stbn/toastmasters",
            "X-Title": "Habla y verás",
          },
          body: JSON.stringify({ model: this.model, state, questions }),
          signal: ctrl.signal,
        });
        if (res.ok) {
          return (await res.json()) as JevResponse & { answers: { [K in keyof Q]: AnswerFor<Q[K]> } };
        }
        const body = await res.text().catch(() => "");
        lastErr = new JevError(`Jev ${res.status}: ${body.slice(0, 300)}`, res.status);
        if (res.status !== 429 && res.status < 500) throw lastErr;
      } catch (err) {
        if (err instanceof JevError) throw err;
        lastErr = new JevError(`Jev request failed: ${(err as Error).message}`, null);
      } finally {
        clearTimeout(timer);
      }
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
    throw lastErr ?? new JevError("Jev request failed", null);
  }

  /**
   * Ask the engine to load its model now (the local SemIf service unloads it
   * after idling). Fire-and-forget: errors are swallowed, OpenRouter has no
   * such endpoint and simply answers 404.
   */
  async warm(): Promise<void> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    try {
      await this.fetchFn(this.url.replace(/\/systemone$/, "/warm"), {
        method: "POST",
        headers: { Authorization: `Bearer ${this.opts.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.model }),
        signal: ctrl.signal,
      });
    } catch {
      /* best effort */
    } finally {
      clearTimeout(timer);
    }
  }
}

export type AnswerFor<Q> = Q extends NoulQuestion
  ? NoulAnswer
  : Q extends ChoiceQuestion
    ? ChoiceAnswer
    : Q extends ScoreQuestion
      ? ScoreAnswer
      : JevAnswer;

/** Confidence as TypeSafe defines it for an n-way choice: (n·pmax − 1)/(n − 1). */
export function choiceConfidence(probabilities: Record<string, number>): number {
  const ps = Object.values(probabilities);
  const n = ps.length;
  if (n < 2) return 1;
  return Math.max(0, (n * Math.max(...ps) - 1) / (n - 1));
}
