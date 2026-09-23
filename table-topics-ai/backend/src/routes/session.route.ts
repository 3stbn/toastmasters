import { createRoute } from "@hono/zod-openapi";
import type { BindedApp } from "../app";
import * as h from "../handlers/session.handler";
import {
  actionBodySchema,
  configPatchSchema,
  createSessionResponse,
  responses,
  sessionCodeParam,
  transcriptBodySchema,
} from "../schemas/session.schema";
import { getServerError, getZodError } from "../utils/errors";
import { errorResponses } from "../utils/responseSchemas";
import type { ClientAction, ConfigPatch } from "../../../shared/protocol";

const tags = ["Sessions"];

const createRouteDef = createRoute({
  method: "post",
  path: "/sessions",
  tags,
  description: "Create a new game session and return its 4-letter code.",
  responses: {
    201: { content: { "application/json": { schema: createSessionResponse } }, description: "Created" },
    ...errorResponses,
  },
});

const getRouteDef = createRoute({
  method: "get",
  path: "/sessions/{code}",
  tags,
  description: "Current session state (also streamed over /sessions/{code}/ws).",
  request: { params: sessionCodeParam },
  responses: responses.state,
});

const patchRouteDef = createRoute({
  method: "patch",
  path: "/sessions/{code}",
  tags,
  description: "Update game mode, topic, settings or the subtitle phrase bank.",
  request: { params: sessionCodeParam, body: { content: { "application/json": { schema: configPatchSchema } } } },
  responses: responses.state,
});

const transcriptRouteDef = createRoute({
  method: "post",
  path: "/sessions/{code}/transcript",
  tags,
  description: "Push a transcript segment (HTTP alternative to the mic WebSocket).",
  request: { params: sessionCodeParam, body: { content: { "application/json": { schema: transcriptBodySchema } } } },
  responses: responses.state,
});

const actionRouteDef = createRoute({
  method: "post",
  path: "/sessions/{code}/action",
  tags,
  description: "Operator actions: start, stop, reset, next_slide, force_subtitle, force_mood, …",
  request: { params: sessionCodeParam, body: { content: { "application/json": { schema: actionBodySchema } } } },
  responses: responses.state,
});

const evaluateRouteDef = createRoute({
  method: "post",
  path: "/sessions/{code}/evaluate",
  tags,
  description: "Run one Jev evaluation synchronously (used by tests and the eval script).",
  request: { params: sessionCodeParam },
  responses: responses.state,
});

export function sessionRoutes(app: BindedApp) {
  app.openapi(createRouteDef, async (c) => {
    try {
      return c.json(await h.createSession(c.env, c.req.header("cf-connecting-ip") ?? ""), 201);
    } catch (error) {
      const { statusCode, message } = getServerError(error);
      return c.json({ message }, statusCode);
    }
  });

  app.openapi(
    getRouteDef,
    async (c) => {
      try {
        return c.json(await h.getSession(c.env, h.normalizeCode(c.req.valid("param").code)), 200);
      } catch (error) {
        const { statusCode, message } = getServerError(error);
        return c.json({ message }, statusCode);
      }
    },
    (result, c) => {
      if (!result.success) {
        const { statusCode, message } = getZodError(result.error);
        return c.json({ message }, statusCode);
      }
    },
  );

  app.openapi(
    patchRouteDef,
    async (c) => {
      try {
        const code = h.normalizeCode(c.req.valid("param").code);
        return c.json(await h.patchSession(c.env, code, c.req.valid("json") as ConfigPatch), 200);
      } catch (error) {
        const { statusCode, message } = getServerError(error);
        return c.json({ message }, statusCode);
      }
    },
    (result, c) => {
      if (!result.success) {
        const { statusCode, message } = getZodError(result.error);
        return c.json({ message }, statusCode);
      }
    },
  );

  app.openapi(
    transcriptRouteDef,
    async (c) => {
      try {
        const code = h.normalizeCode(c.req.valid("param").code);
        await h.postTranscript(c.env, code, c.req.valid("json"));
        return c.json(await h.getSession(c.env, code), 200);
      } catch (error) {
        const { statusCode, message } = getServerError(error);
        return c.json({ message }, statusCode);
      }
    },
    (result, c) => {
      if (!result.success) {
        const { statusCode, message } = getZodError(result.error);
        return c.json({ message }, statusCode);
      }
    },
  );

  app.openapi(
    actionRouteDef,
    async (c) => {
      try {
        const code = h.normalizeCode(c.req.valid("param").code);
        return c.json(await h.postAction(c.env, code, c.req.valid("json") as ClientAction), 200);
      } catch (error) {
        const { statusCode, message } = getServerError(error);
        return c.json({ message }, statusCode);
      }
    },
    (result, c) => {
      if (!result.success) {
        const { statusCode, message } = getZodError(result.error);
        return c.json({ message }, statusCode);
      }
    },
  );

  app.openapi(
    evaluateRouteDef,
    async (c) => {
      try {
        return c.json(await h.evaluateNow(c.env, h.normalizeCode(c.req.valid("param").code)), 200);
      } catch (error) {
        const { statusCode, message } = getServerError(error);
        return c.json({ message }, statusCode);
      }
    },
    (result, c) => {
      if (!result.success) {
        const { statusCode, message } = getZodError(result.error);
        return c.json({ message }, statusCode);
      }
    },
  );

  // WebSocket upgrade: not an OpenAPI route (zod-openapi cannot describe it).
  app.get("/sessions/:code/ws", async (c) => {
    try {
      return await h.websocket(c.env, h.normalizeCode(c.req.param("code")), c.req.raw);
    } catch (error) {
      const { statusCode, message } = getServerError(error);
      return c.json({ message }, statusCode);
    }
  });
}
