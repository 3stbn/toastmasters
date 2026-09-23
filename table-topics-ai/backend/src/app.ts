import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { registerRoutes } from "./routes";
import { createLogger } from "./utils/logger";

export { SessionDO } from "./durable/session.do";
export { QuotaDO } from "./durable/quota.do";

const logger = createLogger("App");

export type HonoContext = { Bindings: Cloudflare.Env };
export type BindedApp = OpenAPIHono<HonoContext>;

export const app = new OpenAPIHono<HonoContext>().basePath("/api");

// Only needed for local dev (frontend :5173 → backend :8787); prod is same-origin.
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173"],
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

registerRoutes(app);

logger.info("Application created");

export default app;
