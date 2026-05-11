import pino from "pino";
import { env } from "@repo/config";

const isDev = env.NODE_ENV !== "production";

const root = pino({
  level: env.LOG_LEVEL,
  transport: isDev
    ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss.l" } }
    : undefined,
});

export function createLogger(name: string) {
  return root.child({ name });
}

export type Logger = ReturnType<typeof createLogger>;
