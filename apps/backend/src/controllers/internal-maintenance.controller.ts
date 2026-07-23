import { throwHttpProblem } from "../lib/problem-details";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { env } from "../lib/env";
import {
  readMaintenanceDiagnostics,
  runExternalMaintenanceTickOrSkip,
  type ExternalMaintenanceTickResult,
} from "../infra/maintenance";

const tickHeaderSchema = z.object({
  "x-internal-token": z.string().min(1).optional(),
});

type InternalMaintenanceRouteDependencies = {
  internalToken?: string | null;
  runTick?: () => Promise<ExternalMaintenanceTickResult>;
  readDiagnostics?: typeof readMaintenanceDiagnostics;
};

export const createInternalMaintenanceRoute = (
  dependencies: InternalMaintenanceRouteDependencies = {},
) => {
  const app = new Hono();
  const internalToken =
    dependencies.internalToken === undefined
      ? env.JOB_RUNNER_INTERNAL_TOKEN
      : dependencies.internalToken;
  const runTick = dependencies.runTick ?? runExternalMaintenanceTickOrSkip;
  const readDiagnostics = dependencies.readDiagnostics ?? readMaintenanceDiagnostics;

  const authorizeToken = (
    providedToken: string | undefined,
  ): "NOT_CONFIGURED" | "UNAUTHORIZED" | null => {
    if (!internalToken) {
      return "NOT_CONFIGURED";
    }
    if (providedToken !== internalToken) return "UNAUTHORIZED";
    return null;
  };

  app.post("/tick", zValidator("header", tickHeaderSchema), async (c) => {
    const authorizationError = authorizeToken(c.req.valid("header")["x-internal-token"]);
    if (authorizationError === "NOT_CONFIGURED") {
      return throwHttpProblem({
        status: 503,
        detail: "Internal maintenance tick endpoint is not configured",
      });
    }
    if (authorizationError === "UNAUTHORIZED")
      return throwHttpProblem({ status: 401, detail: "Unauthorized" });

    const summary = await runTick();
    if ("skipped" in summary) return c.json(summary);
    if (summary.jobsError !== null) return c.json(summary, 500);
    return c.json(summary);
  });

  app.get("/diagnostics", zValidator("header", tickHeaderSchema), async (c) => {
    const authorizationError = authorizeToken(c.req.valid("header")["x-internal-token"]);
    if (authorizationError === "NOT_CONFIGURED") {
      return throwHttpProblem({
        status: 503,
        detail: "Internal maintenance endpoint is not configured",
      });
    }
    if (authorizationError === "UNAUTHORIZED")
      return throwHttpProblem({ status: 401, detail: "Unauthorized" });
    return c.json(await readDiagnostics());
  });

  return app;
};

export const internalMaintenanceRoute = createInternalMaintenanceRoute();
