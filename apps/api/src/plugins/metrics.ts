// Metrics plugin: registers Prometheus collectors, an `onResponse` hook
// that records every HTTP request, and the `/metrics` scrape endpoint.

import fp from "fastify-plugin";
import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";

export const metricsPlugin = fp(async (app) => {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });

  const httpRequests = new Counter({
    name: "helix_api_http_requests_total",
    help: "Total HTTP requests handled by the API gateway",
    labelNames: ["method", "route", "status"] as const,
    registers: [registry],
  });
  const httpDuration = new Histogram({
    name: "helix_api_http_request_duration_seconds",
    help: "HTTP request duration",
    labelNames: ["method", "route"] as const,
    registers: [registry],
  });

  app.addHook("onResponse", async (req, reply) => {
    // `routeOptions.url` is the route pattern (e.g. /conversations/:id),
    // keeping label cardinality bounded; falls back to the raw path on 404.
    const route = req.routeOptions.url ?? req.url;
    httpRequests.inc({
      method: req.method,
      route,
      status: String(reply.statusCode),
    });
    httpDuration.observe(
      { method: req.method, route },
      reply.elapsedTime / 1000,
    );
  });

  app.get("/metrics", async (_req, reply) => {
    reply.header("Content-Type", registry.contentType);
    return registry.metrics();
  });
});
