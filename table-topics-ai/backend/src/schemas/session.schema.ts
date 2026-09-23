import { z } from "@hono/zod-openapi";
import { errorResponses } from "../utils/responseSchemas";

export const sessionCodeParam = z.object({
  code: z.string().regex(/^[A-Za-z]{4}$/).openapi({ param: { name: "code", in: "path" }, example: "KQMZ" }),
});

// The full state is a large, evolving shape owned by shared/session.ts; the
// OpenAPI contract documents it loosely.
export const sessionStateSchema = z.any().openapi("SessionState");

export const gameModeSchema = z.enum(["ilustrador", "subtitulos", "banda"]);

export const configPatchSchema = z
  .object({
    mode: gameModeSchema.nullable().optional(),
    topic: z.string().max(200).optional(),
    settings: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
    behaviors: z
      .array(
        z.object({
          id: z.string().min(1).max(40),
          label: z.string().max(60),
          instructions: z.string().max(600),
          criteria: z.object({ true: z.string().max(400), false: z.string().max(400) }),
          phrases: z.array(z.string().max(120)).min(1).max(20),
          threshold: z.number().min(0).max(1).optional(),
        }),
      )
      .max(30)
      .optional(),
  })
  .openapi("ConfigPatch");

export const transcriptBodySchema = z
  .object({ text: z.string().max(2000), final: z.boolean().default(true) })
  .openapi("TranscriptBody");

export const actionBodySchema = z
  .object({
    type: z.enum(["start", "stop", "reset", "new_page", "clear_subtitle", "force_subtitle", "force_mood", "next_track", "shuffle_topics", "test_sound"]),
    behaviorId: z.string().optional(),
    text: z.string().max(120).optional(),
    mood: z.string().optional(),
  })
  .openapi("ActionBody");

export const createSessionResponse = z.object({ code: z.string() }).openapi("CreateSessionResponse");

export const responses = {
  state: {
    200: { content: { "application/json": { schema: sessionStateSchema } }, description: "Session state" },
    ...errorResponses,
  },
};
