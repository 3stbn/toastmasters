import { ZodError } from "zod";
import { createLogger } from "./logger";

const logger = createLogger("errors");

export type statusCode = 400 | 401 | 403 | 404 | 422 | 429 | 500;

export class ValidationError extends Error {
  statusCode: statusCode;
  constructor(
    message: string = "The data you provided is invalid. Please check your input and try again."
  ) {
    super(message);
    this.statusCode = 422;
  }
}

export class BadRequestError extends Error {
  statusCode: statusCode;
  constructor(
    message: string = "There was a problem with your request. Please try again."
  ) {
    super(message);
    this.statusCode = 400;
  }
}

export class InternalServerError extends Error {
  statusCode: statusCode;
  constructor(
    message: string = "Something went wrong on our end. Please try again later."
  ) {
    super(message);
    this.statusCode = 500;
  }
}
export class NotFoundError extends Error {
  statusCode: statusCode;
  constructor(
    message: string = "The resource you're looking for could not be found."
  ) {
    super(message);
    this.statusCode = 404;
  }
}

export class ConfigurationError extends Error {
  statusCode: statusCode;
  constructor(
    message: string = "There's a configuration issue with the application. Please contact support."
  ) {
    super(message);
    this.statusCode = 500;
  }
}

export class UnauthorizedError extends Error {
  statusCode: statusCode;
  constructor(
    message: string = "You need to be signed in to access this resource."
  ) {
    super(message);
    this.statusCode = 401;
  }
}

export class TooManyRequestsError extends Error {
  statusCode: statusCode;
  constructor(message: string = "Too many requests. Please try again later.") {
    super(message);
    this.statusCode = 429;
  }
}

export class ForbiddenError extends Error {
  statusCode: statusCode;
  constructor(
    message: string = "You don't have permission to access this resource."
  ) {
    super(message);
    this.statusCode = 403;
  }
}
// ... existing code ...

export function getZodError(error: ZodError) {
  const errorMessages = error.errors.map((err) => err.message).join(", ");
  return {
    statusCode: 422 as statusCode,
    message: errorMessages,
  };
}

export function getServerError(error: unknown) {
  logger.error("Server error", error);
  if (error instanceof Error && "statusCode" in error) {
    return {
      statusCode: error.statusCode as statusCode,
      message: error.message,
    };
  }

  return {
    statusCode: 500 as statusCode,
    message: "Internal server error",
  };
}
