import type { BindedApp } from "../app";
import { sessionRoutes } from "./session.route";

export function registerRoutes(app: BindedApp): void {
  sessionRoutes(app);

  app.get("/health", (c) => c.json({ status: "healthy", timestamp: new Date().toISOString() }));

  app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: {
      title: "Table Topics AI",
      version: "0.1.0",
      description: "Toastmasters game night: live Jev (TypeSafe) reactions to improvised Spanish speeches.",
    },
  });
}
