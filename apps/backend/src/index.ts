/**
 * 职责：聚合所有 Controller，导出 AppType。
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";
import { adminCommerceManagementRoute } from "./controllers/admin-commerce-management.controller";
import { adminPaymentManagementRoute } from "./controllers/admin-payment-management.controller";
import { adminPoiRoute } from "./controllers/admin-poi.controller";
import { adminPRManagementRoute } from "./controllers/admin-pr-management.controller";
import { adminPRTypeConfigRoute } from "./controllers/admin-pr-type-config.controller";
import { adminRideHailingManagementRoute } from "./controllers/admin-ride-hailing-management.controller";
import { analyticsRoute } from "./controllers/analytics.controller";
import { authRoute } from "./controllers/auth.controller";
import { commerceRoute } from "./controllers/commerce.controller";
import { configRoute } from "./controllers/config.controller";
import { feedbackQuestionnaireRoute } from "./controllers/feedback-questionnaire.controller";
import { internalMaintenanceRoute } from "./controllers/internal-maintenance.controller";
import { llmRoute } from "./controllers/llm.controller";
import { metaRoute } from "./controllers/meta.controller";
import { partnerRequestRoute } from "./controllers/partner-request.controller";
import { paymentRoute } from "./controllers/payment.controller";
import { paymentProviderRoute } from "./controllers/payment-provider.controller";
import { placementRoute } from "./controllers/placement.controller";
import { poiRoute } from "./controllers/poi.controller";
import { prAuthoringRoute } from "./controllers/pr-authoring.controller";
import { prDiscoveryRoute } from "./controllers/pr-discovery.controller";
import {
  legacyRideHailingProviderRoute,
  rideHailingProviderRoute,
} from "./controllers/ride-hailing-provider.controller";
import { shareRoute } from "./controllers/share.controller";
import { studySprintRoute } from "./controllers/study-sprint.controller";
import { telemetryRoute } from "./controllers/telemetry.controller";
import { uploadRoute } from "./controllers/upload.controller";
import { userRoute } from "./controllers/user.controller";
import { wechatRoute } from "./controllers/wechat.controller";
import { wecomRoute } from "./controllers/wecom.controller";
import { jobRunner } from "./infra/jobs";
import {
  bootstrapOfficialAccountFollowSyncJob,
  registerOfficialAccountFollowSyncJobs,
} from "./infra/marketing";
import {
  registerWeChatActivityStartReminderJobs,
  registerWeChatMeetingPointUpdatedJobs,
  registerWeChatNewPartnerJobs,
  registerWeChatPRMessageJobs,
  registerWeChatPRReadyJobs,
  registerWeChatReminderJobs,
  registerWeChatWaitlistAlternativeAvailableJobs,
  registerWeChatWaitlistPromotedJobs,
} from "./infra/notifications";
import { JOURNEY_ID_HEADER, journeyContextMiddleware } from "./infra/telemetry";
import { env } from "./lib/env";
import {
  buildGenericProblemDetailsPayload,
  buildProblemDetailsPayload,
  ProblemDetailsError,
} from "./lib/problem-details";
import {
  getWechatDomainVerificationContent,
  MPWX_DOMAIN_VERIFICATION_FILENAME,
  WXOA_DOMAIN_VERIFICATION_FILENAME,
} from "./lib/wechat-domain-verification";
import { withTimeout } from "./lib/with-timeout";

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
    console.error("[OfficialAccountFollowSync] failed to bootstrap sync job", error);
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
      "x-commerce-order-debug",
      "x-commerce-order-debug-session",
      "x-commerce-order-debug-request",
      "x-commerce-order-debug-channel",
      "x-commerce-order-debug-source",
      "x-commerce-order-debug-trigger",
      "x-commerce-order-debug-route-order-id",
      "x-commerce-order-debug-order-id",
      "x-commerce-order-debug-bill-id",
    ],
    exposeHeaders: ["x-access-token"],
  }),
);
app.use("*", journeyContextMiddleware);
app.use("*", async (c, next) => {
  try {
    await next();
  } finally {
    const shouldSkipRequestTail =
      c.req.method === "OPTIONS" ||
      c.req.path === "/health" ||
      c.req.path === `/${MPWX_DOMAIN_VERIFICATION_FILENAME}` ||
      c.req.path.startsWith("/internal/");

    if (!shouldSkipRequestTail && process.env.BACKEND_SCENARIO_DISABLE_REQUEST_TAIL !== "true") {
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
  .route("/api/pr/authoring", prAuthoringRoute)
  .route("/api/pr/discovery", prDiscoveryRoute)
  .route("/api/pr", partnerRequestRoute)
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
  .route("/api/placements", placementRoute)
  .route("/api/study-sprint", studySprintRoute)
  .route("/api/payment", paymentRoute)
  .route("/api/payment", paymentProviderRoute)
  .route("/api/ride-hailing", rideHailingProviderRoute)
  .route("/api/v1/service_provider", legacyRideHailingProviderRoute)
  .route("/api/admin", adminPRManagementRoute)
  .route("/api/admin", adminPRTypeConfigRoute)
  .route("/api/admin", adminCommerceManagementRoute)
  .route("/api/admin", adminPaymentManagementRoute)
  .route("/api/admin", adminRideHailingManagementRoute)
  .route("/api/admin", adminPoiRoute)
  .route("/internal/maintenance", internalMaintenanceRoute);

// Health check
app.get(`/${MPWX_DOMAIN_VERIFICATION_FILENAME}`, (c) => {
  return c.body(getWechatDomainVerificationContent(MPWX_DOMAIN_VERIFICATION_FILENAME), 200, {
    "Content-Type": "text/plain; charset=utf-8",
  });
});

app.get(`/${WXOA_DOMAIN_VERIFICATION_FILENAME}`, (c) => {
  return c.body(getWechatDomainVerificationContent(WXOA_DOMAIN_VERIFICATION_FILENAME), 200, {
    "Content-Type": "text/plain; charset=utf-8",
  });
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
  nextRequestTailJobTickAtMs = Date.now() + env.REQUEST_TAIL_JOB_TICK_MIN_INTERVAL_MS;

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

export type { OrderingEntryPayload, OrderingOfferDetail } from "./domains/merchandising";
export type {
  PRAuthoringDefaultSelection,
  PRAuthoringLocationOption,
  PRAuthoringMapCoordinate,
  PRAuthoringOptions,
  PRAuthoringPlaceDisabledReason,
  PRAuthoringRouteOption,
  PRAuthoringStartOption,
  PRTypeRouteApplicationView,
} from "./domains/pr-authoring";
export type {
  PRDiscoveryCandidate,
  PRDiscoveryCardGroup,
  PRDiscoveryCatalogItem,
  PRDiscoveryConfigRow,
  PRDiscoveryDirectoryResponse,
  PRDiscoveryPlaceSelection,
  PRDiscoveryRecommendationCandidate,
  PRDiscoveryRecommendationMatch,
  PRDiscoveryRecommendationResponse,
  PRDiscoveryTypeDetail,
  PRDiscoveryViewMode,
  PRDiscoveryViewRatios,
} from "./domains/pr-discovery";
export type {
  FeedbackQuestionnaireInstanceId,
  FeedbackQuestionnaireTemplateId,
} from "./entities/feedback-questionnaire";
export type { PartnerId, PartnerPaymentStatus, PartnerStatus } from "./entities/partner";
export { partnerIdSchema, partnerStatusSchema } from "./entities/partner";
// Export types for frontend use
export type {
  PRId,
} from "./entities/partner-request";
export {
  createNaturalLanguagePRSchema,
  createPRStructuredStatusSchema,
  createStructuredPRSchema,
  partnerRequestFieldsSchema,
} from "./entities/partner-request";
export { PR_MESSAGE_BODY_MAX_LENGTH } from "./entities/pr-message";
export type { UserId, UserRole, UserSex, UserStatus } from "./entities/user";
export {
  userIdSchema,
  userRoleSchema,
  userRolesSchema,
  userSexSchema,
  userStatusSchema,
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
