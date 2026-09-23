import type { BindedApp } from "../app";
import { sessionRoutes } from "./session.route";

export function registerRoutes(app: BindedApp): void {
  sessionRoutes(app);

  app.get("/health", (c) => c.json({ status: "healthy", timestamp: new Date().toISOString() }));

  app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: {
      title: "Habla y verás",
      version: "0.1.0",
      description: "Speaking game: live Jev (TypeSafe) reactions to improvised Spanish talks.",
    },
  });
}
