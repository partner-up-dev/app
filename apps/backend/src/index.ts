/**
 * 职责：聚合所有 Controller，导出 AppType。
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";
import { partnerRequestRoute } from "./controllers/partner-request.controller";
import { authRoute } from "./controllers/auth.controller";
import { userRoute } from "./controllers/user.controller";
import { llmRoute } from "./controllers/llm.controller";
import { uploadRoute } from "./controllers/upload.controller";
import { feedbackQuestionnaireRoute } from "./controllers/feedback-questionnaire.controller";
import { wechatRoute } from "./controllers/wechat.controller";
import { shareRoute } from "./controllers/share.controller";
import { wecomRoute } from "./controllers/wecom.controller";
import { configRoute } from "./controllers/config.controller";
import { analyticsRoute } from "./controllers/analytics.controller";
import { telemetryRoute } from "./controllers/telemetry.controller";
import { anchorEventRoute } from "./controllers/anchor-event.controller";
import { internalMaintenanceRoute } from "./controllers/internal-maintenance.controller";
import { poiRoute } from "./controllers/poi.controller";
import { metaRoute } from "./controllers/meta.controller";
import { adminAnchorManagementRoute } from "./controllers/admin-anchor-management.controller";
import { adminPoiRoute } from "./controllers/admin-poi.controller";
import { adminCommerceManagementRoute } from "./controllers/admin-commerce-management.controller";
import { adminRideHailingManagementRoute } from "./controllers/admin-ride-hailing-management.controller";
import { commerceRoute } from "./controllers/commerce.controller";
import { paymentProviderRoute } from "./controllers/payment-provider.controller";
import {
  legacyRideHailingProviderRoute,
  rideHailingProviderRoute,
} from "./controllers/ride-hailing-provider.controller";
import { jobRunner } from "./infra/jobs";
import {
  JOURNEY_ID_HEADER,
  journeyContextMiddleware,
} from "./infra/telemetry";
import {
  bootstrapOfficialAccountFollowSyncJob,
  registerOfficialAccountFollowSyncJobs,
} from "./infra/marketing";
import {
  registerWeChatActivityStartReminderJobs,
  registerWeChatMeetingPointUpdatedJobs,
  registerWeChatNewPartnerJobs,
  registerWeChatPRReadyJobs,
  registerWeChatPRMessageJobs,
  registerWeChatReminderJobs,
  registerWeChatWaitlistAlternativeAvailableJobs,
  registerWeChatWaitlistPromotedJobs,
} from "./infra/notifications";
import { env } from "./lib/env";
import {
  buildGenericProblemDetailsPayload,
  buildProblemDetailsPayload,
  ProblemDetailsError,
} from "./lib/problem-details";
import { withTimeout } from "./lib/with-timeout";
import {
  getWechatDomainVerificationContent,
  MPWX_DOMAIN_VERIFICATION_FILENAME,
  WXOA_DOMAIN_VERIFICATION_FILENAME,
} from "./lib/wechat-domain-verification";

export const app = new Hono();
registerWeChatReminderJobs();
registerWeChatActivityStartReminderJobs();
registerWeChatNewPartnerJobs();
registerWeChatPRMessageJobs();
registerWeChatMeetingPointUpdatedJobs();
registerWeChatPRReadyJobs();
registerWeChatWaitlistPromotedJobs();
registerWeChatWaitlistAlternativeAvailableJobs();
registerOfficialAccountFollowSyncJobs();
if (process.env.BACKEND_SCENARIO_DISABLE_BOOTSTRAP !== "true") {
  void bootstrapOfficialAccountFollowSyncJob().catch((error) => {
    console.error(
      "[OfficialAccountFollowSync] failed to bootstrap sync job",
      error,
    );
  });
}

// Middleware
if (process.env.BACKEND_SCENARIO_DISABLE_REQUEST_LOGGER !== "true") {
  app.use("*", logger());
}
app.use(
  "*",
  cors({
    origin: (origin) => origin ?? "*",
    credentials: true,
    allowHeaders: [
      "Content-Type",
      "Authorization",
      JOURNEY_ID_HEADER,
      "x-client-id",
    ],
    exposeHeaders: ["x-access-token"],
  }),
);
app.use("*", journeyContextMiddleware);
app.use("*", async (c, next) => {
  try {
    await next();
  } finally {
    if (
      c.req.method === "OPTIONS" ||
      c.req.path === "/health" ||
      c.req.path === `/${MPWX_DOMAIN_VERIFICATION_FILENAME}` ||
      c.req.path.startsWith("/internal/")
    ) {
      return;
    }

    if (process.env.BACKEND_SCENARIO_DISABLE_REQUEST_TAIL !== "true") {
      kickRequestTailMaintenance();
    }
  }
});

// Global error handler
app.onError((err, c) => {
  const respondProblem = (
    payload: ReturnType<typeof buildGenericProblemDetailsPayload>,
    status: number,
    contentLanguage = "en-US",
  ) =>
    c.body(JSON.stringify(payload), status as ContentfulStatusCode, {
      "Content-Type": "application/problem+json; charset=utf-8",
      "Content-Language": contentLanguage,
    });

  if (err instanceof ProblemDetailsError) {
    const { payload, contentLanguage } = buildProblemDetailsPayload(
      err,
      c.req.header("accept-language"),
    );
    return respondProblem(payload, err.status, contentLanguage);
  }

  if (err instanceof HTTPException) {
    const codedError = err as HTTPException & { code?: string };
    const code =
      typeof codedError.code === "string" && codedError.code.length > 0
        ? codedError.code
        : undefined;
    return respondProblem(
      buildGenericProblemDetailsPayload({
        status: err.status,
        detail: err.message,
        code,
      }),
      err.status,
    );
  }

  if (err instanceof ZodError) {
    return respondProblem(
      buildGenericProblemDetailsPayload({
        status: 422,
        detail: err.issues.map((issue) => issue.message).join("; "),
        code: "VALIDATION_FAILED",
        type: "https://partner-up.app/problems/validation.failed",
      }),
      422,
    );
  }
  console.error(err);
  return respondProblem(
    buildGenericProblemDetailsPayload({
      status: 500,
      detail: "Internal Server Error",
      type: "https://partner-up.app/problems/internal.server_error",
    }),
    500,
  );
});

// Mount routes
export const routes = app
  .route("/api/auth", authRoute)
  .route("/api/users", userRoute)
  .route("/api/pr", partnerRequestRoute)
  .route("/api/events", anchorEventRoute)
  .route("/api/llm", llmRoute)
  .route("/api/share", shareRoute)
  .route("/api/upload", uploadRoute)
  .route("/api/feedback", feedbackQuestionnaireRoute)
  .route("/api/wechat", wechatRoute)
  .route("/api/wecom", wecomRoute)
  .route("/api/config", configRoute)
  .route("/api/meta", metaRoute)
  .route("/api/analytics", analyticsRoute)
  .route("/api/telemetry", telemetryRoute)
  .route("/api/pois", poiRoute)
  .route("/api/commerce", commerceRoute)
  .route("/api/payment", paymentProviderRoute)
  .route("/api/ride-hailing", rideHailingProviderRoute)
  .route("/api/v1/service_provider", legacyRideHailingProviderRoute)
  .route("/api/admin", adminAnchorManagementRoute)
  .route("/api/admin", adminCommerceManagementRoute)
  .route("/api/admin", adminRideHailingManagementRoute)
  .route("/api/admin", adminPoiRoute)
  .route("/internal/maintenance", internalMaintenanceRoute);

// Health check
app.get(`/${MPWX_DOMAIN_VERIFICATION_FILENAME}`, (c) => {
  return c.body(
    getWechatDomainVerificationContent(MPWX_DOMAIN_VERIFICATION_FILENAME),
    200,
    {
      "Content-Type": "text/plain; charset=utf-8",
    },
  );
});

app.get(`/${WXOA_DOMAIN_VERIFICATION_FILENAME}`, (c) => {
  return c.body(
    getWechatDomainVerificationContent(WXOA_DOMAIN_VERIFICATION_FILENAME),
    200,
    {
      "Content-Type": "text/plain; charset=utf-8",
    },
  );
});

app.get("/health", (c) => c.json({ status: "ok", jobs: jobRunner.status() }));

// Export type for RPC client
export type AppType = typeof routes;

let nextRequestTailJobTickAtMs = 0;
let requestTailMaintenanceInFlight: Promise<void> | null = null;

const kickRequestTailMaintenance = (): void => {
  if (requestTailMaintenanceInFlight) {
    return;
  }

  requestTailMaintenanceInFlight = runRequestTailMaintenance()
    .catch((error) => {
      console.error("[RequestTail] maintenance failed", error);
    })
    .finally(() => {
      requestTailMaintenanceInFlight = null;
    });
};

const runRequestTailMaintenance = async (): Promise<void> => {
  if (Date.now() < nextRequestTailJobTickAtMs) {
    return;
  }
  nextRequestTailJobTickAtMs =
    Date.now() + env.REQUEST_TAIL_JOB_TICK_MIN_INTERVAL_MS;

  try {
    await withTimeout(
      jobRunner.runDueJobs({
        source: "request-tail",
        batchSize: env.JOB_RUNNER_CLAIM_BATCH_SIZE,
        maxBatches: env.REQUEST_TAIL_JOB_TICK_MAX_BATCHES,
        budgetMs: env.REQUEST_TAIL_JOB_TICK_BUDGET_MS,
        leaseMs: env.JOB_RUNNER_LEASE_MS,
        claimStatementTimeoutMs: env.REQUEST_TAIL_JOB_TICK_BUDGET_MS,
      }),
      env.REQUEST_TAIL_JOB_TICK_BUDGET_MS,
      "Request-tail job tick timed out",
    );
  } catch (error) {
    console.error("[RequestTail] job tick failed", error);
  }
};

// Export types for frontend use
export type {
  PartnerRequestFields,
  CreatePRStructuredStatus,
  CoordinatePair,
  PRStatus,
  PRStatusManual,
  PRId,
  PRRoute,
  PRRoutePoint,
  WeekdayLabel,
} from "./entities/partner-request";
export type {
  PartnerId,
  PartnerStatus,
  PartnerPaymentStatus,
} from "./entities/partner";
export type { UserId, UserRole, UserStatus, UserSex } from "./entities/user";
export type {
  AnchorEventId,
  AnchorEventParticipationFrequencyLimit,
  AnchorEventRoutePool,
  AnchorEventRoutePoolEntry,
  AnchorEventStatus,
  LocationEntry,
  TimeWindowEntry,
} from "./entities/anchor-event";
export type {
  PRJoinGateConfig,
  PRJoinGateConfigItem,
  PRJoinGateSource,
  PRJoinNoticeGateConfig,
} from "./entities/join-gate";
export type { VisibilityStatus } from "./entities/partner-request";
export type {
  AnchorEventSummary,
  AnchorEventDetail,
  AnchorEventDemandCard,
  BrowseTimeWindowDetail,
  CreateTimeWindowDetail,
  EventPRSummary,
} from "./domains/anchor-event";
export type { AnchorEventRouteApplicationView } from "./domains/anchor-event-route-application";
export type {
  AnchorEventAnalyticsRenderedMode,
  AnchorEventFunnelResponse,
} from "./infra/analytics";
export {
  partnerRequestFieldsSchema,
  createStructuredPRSchema,
  createNaturalLanguagePRSchema,
  createPRStructuredStatusSchema,
} from "./entities/partner-request";
export type { ImageUploadPurpose } from "./infra/storage/image-storage.service";
export type {
  FeedbackQuestionnaireAnswers,
  FeedbackQuestionnaireDefinition,
  FeedbackQuestionnaireInstanceId,
  FeedbackQuestionnaireTemplateId,
} from "./entities/feedback-questionnaire";
export { PR_MESSAGE_BODY_MAX_LENGTH } from "./entities/pr-message";
export { partnerIdSchema, partnerStatusSchema } from "./entities/partner";
export {
  userIdSchema,
  userRoleSchema,
  userRolesSchema,
  userStatusSchema,
  userSexSchema,
} from "./entities/user";

const isMainModule = (moduleUrl: string): boolean => {
  const entryPath = process.argv[1];
  if (!entryPath) return false;
  return path.resolve(fileURLToPath(moduleUrl)) === path.resolve(entryPath);
};

if (isMainModule(import.meta.url)) {
  serve({
    fetch: app.fetch,
    port: env.PORT,
  });

  console.log(`Server running on http://localhost:${env.PORT}`);
}
