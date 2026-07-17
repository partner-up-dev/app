import { throwHttpProblem } from "../lib/problem-details";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { env } from "../lib/env";
import { runExternalMaintenanceTickOrSkip } from "../infra/maintenance";

const app = new Hono();

const tickHeaderSchema = z.object({
  "x-internal-token": z.string().min(1).optional(),
});

export const internalMaintenanceRoute = app.post(
  "/tick",
  zValidator("header", tickHeaderSchema),
  async (c) => {
    if (!env.JOB_RUNNER_INTERNAL_TOKEN) {
      return throwHttpProblem({
        status: 503,
        detail: "Internal maintenance tick endpoint is not configured",
      });
    }

    const header = c.req.valid("header");
    if (header["x-internal-token"] !== env.JOB_RUNNER_INTERNAL_TOKEN) {
      return throwHttpProblem({ status: 401, detail: "Unauthorized" });
    }

    const summary = await runExternalMaintenanceTickOrSkip();
    if ("skipped" in summary) {
      return c.json(summary);
    }

    if (summary.jobsError !== null) {
      return c.json(summary, 500);
    }

    return c.json(summary);
  },
);
