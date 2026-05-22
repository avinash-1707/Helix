// Shared structured logger. Passed to Fastify as its logger instance so
// request logs and application logs share one stream.

import { pino } from "pino";

export const logger = pino({ name: "helix-api" });
