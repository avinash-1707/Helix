// Shared structured logger for the ingestion service.

import { pino } from "pino";

export const logger = pino({ name: "helix-ingestion" });
