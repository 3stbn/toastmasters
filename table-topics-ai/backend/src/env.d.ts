declare namespace Cloudflare {
  interface Env {
    SESSIONS: DurableObjectNamespace;
    /** Singleton counting sessions created per day (see durable/quota.do.ts). */
    QUOTA: DurableObjectNamespace<import("./durable/quota.do").QuotaDO>;
    OPENROUTER_KEY: string;
    JEV_MODEL?: string;
    /** SemIf service (personal/local-ai) reached through the tunnel, e.g. https://semif.esteban.site/v1 */
    LOCAL_JEV_URL?: string;
    LOCAL_JEV_KEY?: string;
    LOCAL_JEV_MODEL?: string;
  }
}
interface Env extends Cloudflare.Env {}
