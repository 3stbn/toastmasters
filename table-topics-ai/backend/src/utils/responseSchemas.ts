import { z } from "@hono/zod-openapi";

/**
 * Common error response schema used across API endpoints
 */
export const errorResponseSchema = z.object({
  message: z.string(),
});

/**
 * Standard error response objects for OpenAPI documentation
 */
export const errorResponses = {
  400: {
    content: {
      "application/json": {
        schema: errorResponseSchema,
      },
    },
    description: "Bad request",
  },
  401: {
    content: {
      "application/json": {
        schema: errorResponseSchema,
      },
    },
    description: "Unauthorized",
  },
  403: {
    content: {
      "application/json": {
        schema: errorResponseSchema,
      },
    },
    description: "Forbidden",
  },
  404: {
    content: {
      "application/json": {
        schema: errorResponseSchema,
      },
    },
    description: "Not found",
  },
  422: {
    content: {
      "application/json": {
        schema: errorResponseSchema,
      },
    },
    description: "Unprocessable entity",
  },
  429: {
    content: {
      "application/json": {
        schema: errorResponseSchema,
      },
    },
    description: "Too many requests",
  },
  500: {
    content: {
      "application/json": {
        schema: errorResponseSchema,
      },
    },
    description: "Internal server error",
  },
};
