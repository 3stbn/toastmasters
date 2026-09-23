/* eslint-disable */
export type LogLevel = "debug" | "info" | "warn" | "error";

const logLevelMap: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const configuredLogLevel = "debug";

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  debug(message: string, meta?: any): void {
    this.log("debug", message, meta);
  }

  info(message: string, meta?: any): void {
    this.log("info", message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log("warn", message, meta);
  }

  error(message: string, error?: any, meta?: any): void {
    this.log("error", message, {
      ...meta,
      error: this.serializeError(error),
    });
  }
  private serializeError(error: any): any {
    if (!error) return error;
    if (typeof error === "string") return error;

    return {
      message: error.message,
      stack: error.stack,
      ...(error.cause ? { cause: this.serializeError(error.cause) } : {}),
    };
  }

  private log(level: LogLevel, message: string, meta?: any): void {
    if (logLevelMap[level] < logLevelMap[configuredLogLevel]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      context: this.context,
      message,
      ...(meta ? { meta } : {}),
    };

    switch (level) {
      case "debug":
        console.log(JSON.stringify(logData));
        break;
      case "info":
        console.log(JSON.stringify(logData));
        break;
      case "warn":
        console.warn(JSON.stringify(logData));
        break;
      case "error":
        console.error(JSON.stringify(logData));
        break;
    }
  }
}

export const createLogger = (context: string): Logger => {
  return new Logger(context);
};
