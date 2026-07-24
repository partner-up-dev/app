import { z } from "zod";
import { prStatusSchema } from "../../domains/pr/contracts/partner-request";

export const userTelemetryAttributeValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const userTelemetryAttributesSchema = z.record(userTelemetryAttributeValueSchema);

export const userTelemetryPayloadSchema = z.record(z.unknown());

export type UserTelemetryAttributes = z.infer<typeof userTelemetryAttributesSchema>;

export type UserTelemetryPayload = z.infer<typeof userTelemetryPayloadSchema>;

export type UserTelemetryConsentClass = "functional" | "analytics" | "sensitive";

export type UserTelemetryEventContract<
  TEventName extends string = string,
  TEventVersion extends number = number,
  TAttributesSchema extends z.ZodTypeAny = z.ZodTypeAny,
  TPayloadSchema extends z.ZodTypeAny = z.ZodTypeAny,
  TOwner extends string = string,
> = {
  eventName: TEventName;
  eventFamily: string;
  eventVersion: TEventVersion;
  owner: TOwner;
  trigger: string;
  forbidden: string;
  attributesSchema: TAttributesSchema;
  payloadSchema: TPayloadSchema;
  consentClass: UserTelemetryConsentClass;
  biUsage: readonly string[];
  deprecated?: {
    replacement?: string;
    reason: string;
  };
};

/** Preserve name/version/schema literals for the derived canonical event type. */
export const defineUserTelemetryEventContract = <
  const TEventName extends string,
  const TEventVersion extends number,
  const TAttributesSchema extends z.ZodTypeAny,
  const TPayloadSchema extends z.ZodTypeAny,
  const TOwner extends string,
>(
  contract: UserTelemetryEventContract<
    TEventName,
    TEventVersion,
    TAttributesSchema,
    TPayloadSchema,
    TOwner
  >,
): UserTelemetryEventContract<
  TEventName,
  TEventVersion,
  TAttributesSchema,
  TPayloadSchema,
  TOwner
> => contract;

export type UserTelemetryRegistryValidationResult =
  | {
      ok: true;
      contract: UserTelemetryEventContract;
      attributes: UserTelemetryAttributes;
      payload: UserTelemetryPayload;
    }
  | {
      ok: false;
      failureCode: string;
      failureMessage: string;
    };

const looseAttributesSchema = userTelemetryAttributesSchema;
const loosePayloadSchema = userTelemetryPayloadSchema;

const contextEvent = <const TEventName extends string>(
  eventName: TEventName,
  eventFamily: string,
  trigger: string,
  biUsage: readonly string[],
): UserTelemetryEventContract<
  TEventName,
  1,
  typeof looseAttributesSchema,
  typeof loosePayloadSchema,
  "infra.telemetry"
> =>
  defineUserTelemetryEventContract({
    eventName,
    eventFamily,
    eventVersion: 1,
    owner: "infra.telemetry",
    trigger,
    forbidden: "Do not emit as a substitute for a user behavior event.",
    attributesSchema: looseAttributesSchema,
    payloadSchema: loosePayloadSchema,
    consentClass: "analytics",
    biUsage,
  });

const looseEvent = <const TEventName extends string, const TOwner extends string>(
  eventName: TEventName,
  eventFamily: string,
  owner: TOwner,
  biUsage: readonly string[],
): UserTelemetryEventContract<
  TEventName,
  1,
  typeof looseAttributesSchema,
  typeof loosePayloadSchema,
  TOwner
> =>
  defineUserTelemetryEventContract({
    eventName,
    eventFamily,
    eventVersion: 1,
    owner,
    trigger:
      "Registered legacy-compatible event. Call-site trigger must be documented before semantic version changes.",
    forbidden: "Do not emit for automatic system lifecycle facts.",
    attributesSchema: looseAttributesSchema,
    payloadSchema: loosePayloadSchema,
    consentClass: "analytics",
    biUsage,
  });

const prDiscoveryBasePayloadSchema = z
  .object({
    prType: z.string().trim().min(1).max(120),
    viewMode: z.enum(["LIST", "CARD", "FORM"]),
    origin: z.string().trim().min(1).max(120),
    prId: z.number().int().positive().optional(),
  })
  .strict();

const prDiscoveryEvent = <
  const TEventName extends string,
  const TPayloadSchema extends z.ZodTypeAny,
>(
  eventName: TEventName,
  payloadSchema: TPayloadSchema,
  biUsage: readonly string[],
): UserTelemetryEventContract<
  TEventName,
  1,
  typeof looseAttributesSchema,
  TPayloadSchema,
  "frontend.pr-discovery"
> =>
  defineUserTelemetryEventContract({
    eventName,
    eventFamily: "pr.discovery",
    eventVersion: 1,
    owner: "frontend.pr-discovery",
    trigger: "User-visible PR Discovery interaction or transition.",
    forbidden:
      "Do not include route-scoped identity, experiment assignment metadata, config history, or anonymous identity fields.",
    attributesSchema: looseAttributesSchema,
    payloadSchema,
    consentClass: "analytics",
    biUsage,
  });

const prIdTelemetrySchema = z.number().int().positive();

const prCreatedPayloadSchema = z
  .object({
    pr_id: prIdTelemetrySchema,
    creation_path: z.enum(["pr_discovery", "structured_form", "natural_language"]),
    status: prStatusSchema,
  })
  .strict();

const prJoinedPayloadSchema = z
  .object({
    pr_id: prIdTelemetrySchema,
    result_status: z.literal("success"),
  })
  .strict();

const prWaitlistedPayloadSchema = z
  .object({
    pr_id: prIdTelemetrySchema,
    result_status: z.literal("success"),
    alternative_pr_reminder_opt_in: z.boolean(),
  })
  .strict();

const prClosedPayloadSchema = z
  .object({
    pr_id: prIdTelemetrySchema,
    from_status: prStatusSchema,
    to_status: z.literal("CLOSED"),
  })
  .strict();

const authSessionCreatedPayloadSchema = z
  .object({
    session_role: z.string().trim().min(1).max(64),
    anonymous_id: z.string().trim().min(1).max(256),
    authenticated_user_hash: z.string().trim().min(1).max(256).nullable(),
  })
  .strict();

export const userTelemetryEventRegistry = [
  contextEvent(
    "journey.started",
    "journey.lifecycle",
    "A new application activity journey starts.",
    ["journey_context", "retention"],
  ),
  contextEvent(
    "journey.ended",
    "journey.lifecycle",
    "An application activity journey ends or times out.",
    ["journey_context"],
  ),
  contextEvent(
    "route.entered",
    "route.lifecycle",
    "The frontend enters a route inside the current journey.",
    ["route_context", "funnel_context"],
  ),
  contextEvent(
    "route.left",
    "route.lifecycle",
    "The frontend leaves a route inside the current journey.",
    ["route_context"],
  ),
  defineUserTelemetryEventContract({
    ...contextEvent(
      "auth.session.created",
      "auth.session",
      "A browser auth session is created or refreshed with identity context.",
      ["identity_context", "retention"],
    ),
    payloadSchema: authSessionCreatedPayloadSchema,
  }),
  contextEvent(
    "consent.changed",
    "consent.lifecycle",
    "The user's analytics consent state changes.",
    ["consent_context"],
  ),
  contextEvent(
    "experiment.assigned",
    "experiment.assignment",
    "The user is assigned to an experiment variant.",
    ["experiment_context"],
  ),
  contextEvent("visibility.changed", "browser.visibility", "The page visibility state changes.", [
    "runtime_context",
  ]),
  contextEvent("network.changed", "browser.network", "The browser network state changes.", [
    "runtime_context",
  ]),
  {
    ...contextEvent(
      "segment.started",
      "legacy.segment",
      "Legacy v1 segment context was reconstructed during migration.",
      ["legacy_migration"],
    ),
    deprecated: {
      reason: "Segments are retired from the target telemetry model.",
    },
  },
  {
    ...contextEvent(
      "segment.ended",
      "legacy.segment",
      "Legacy v1 segment end context was reconstructed during migration.",
      ["legacy_migration"],
    ),
    deprecated: {
      reason: "Segments are retired from the target telemetry model.",
    },
  },

  looseEvent("page.viewed", "page.viewed", "frontend.app", ["route_activity"]),
  prDiscoveryEvent("pr.discovery.surface.viewed", prDiscoveryBasePayloadSchema, [
    "pr_discovery_funnel",
    "bi_overview",
  ]),
  prDiscoveryEvent("pr.discovery.criteria.submitted", prDiscoveryBasePayloadSchema, [
    "pr_discovery_funnel",
  ]),
  prDiscoveryEvent(
    "pr.discovery.recommendation.returned",
    prDiscoveryBasePayloadSchema.extend({ outcome: z.enum(["matched", "no_match"]) }).strict(),
    ["pr_discovery_funnel"],
  ),
  prDiscoveryEvent(
    "pr.discovery.candidate.impression",
    prDiscoveryBasePayloadSchema
      .extend({ prId: z.number().int().positive(), rank: z.number().int().positive().optional() })
      .strict(),
    ["pr_discovery_funnel"],
  ),
  prDiscoveryEvent(
    "pr.discovery.candidate.action",
    prDiscoveryBasePayloadSchema
      .extend({ prId: z.number().int().positive(), action: z.string().trim().min(1).max(64) })
      .strict(),
    ["pr_discovery_funnel"],
  ),
  prDiscoveryEvent(
    "pr.discovery.authoring.handoff",
    prDiscoveryBasePayloadSchema
      .extend({ handoffReason: z.enum(["NO_MATCH", "USER_REQUEST", "EMPTY_STATE"]) })
      .strict(),
    ["pr_discovery_funnel", "pr_create_funnel"],
  ),
  looseEvent("pr.entry.reached", "pr.entry", "frontend.pr", ["pr_funnel"]),
  looseEvent("pr.commitment.result", "pr.commitment_result", "frontend.pr", ["pr_funnel"]),
  looseEvent("pr.create.result", "pr.create_result", "frontend.pr", ["pr_create_funnel"]),
  looseEvent("pr.join.result", "pr.join_result", "frontend.pr", ["pr_join_funnel"]),
  looseEvent("pr.waitlist.result", "pr.waitlist_result", "frontend.pr", ["pr_join_funnel"]),
  looseEvent("pr.exit.succeeded", "pr.exit_result", "frontend.pr", ["pr_lifecycle_user_command"]),
  looseEvent("pr.confirm.succeeded", "pr.confirm_result", "frontend.pr", [
    "pr_lifecycle_user_command",
  ]),
  looseEvent("pr.checkin.submitted", "pr.checkin", "frontend.pr", ["pr_lifecycle_user_command"]),
  defineUserTelemetryEventContract({
    ...looseEvent("pr.created", "pr.created", "backend.pr", ["pr_create_funnel"]),
    payloadSchema: prCreatedPayloadSchema,
  }),
  defineUserTelemetryEventContract({
    ...looseEvent("pr.joined", "pr.joined", "backend.pr", ["pr_join_funnel"]),
    payloadSchema: prJoinedPayloadSchema,
  }),
  defineUserTelemetryEventContract({
    ...looseEvent("pr.waitlisted", "pr.waitlisted", "backend.pr", ["pr_join_funnel"]),
    payloadSchema: prWaitlistedPayloadSchema,
  }),
  defineUserTelemetryEventContract({
    ...looseEvent("pr.closed", "pr.closed", "backend.pr", ["pr_close_funnel"]),
    payloadSchema: prClosedPayloadSchema,
  }),
  looseEvent("share.method.switch", "share.method", "frontend.share", ["share_usage"]),
  looseEvent("share.link.native.success", "share.link", "frontend.share", ["share_usage"]),
  looseEvent("share.link.copy.success", "share.link", "frontend.share", ["share_usage"]),
  looseEvent("share.link.failed", "share.link", "frontend.share", ["share_usage"]),
  looseEvent("share.session.started", "share.session", "frontend.share", ["share_usage"]),
  looseEvent("share.descriptor.submitted", "share.descriptor", "frontend.share", ["share_usage"]),
  looseEvent("share.descriptor.discarded.stale", "share.descriptor", "frontend.share", [
    "share_usage",
  ]),
  looseEvent("share.apply.fallback.success", "share.apply", "frontend.share", ["share_usage"]),
  looseEvent("share.apply.base.success", "share.apply", "frontend.share", ["share_usage"]),
  looseEvent("share.apply.enriched.success", "share.apply", "frontend.share", ["share_usage"]),
  looseEvent("share.apply.failed", "share.apply", "frontend.share", ["share_usage"]),
  looseEvent("share.replay.triggered", "share.replay", "frontend.share", ["share_usage"]),
  looseEvent("home.hero.primary.click", "home.navigation", "frontend.home", ["home_conversion"]),
  looseEvent("home.create.entry.click", "home.create_entry", "frontend.home", ["pr_create_funnel"]),
  looseEvent(
    "official.account.follow.nudge.shown",
    "official_account_follow.nudge",
    "frontend.marketing",
    ["official_account_follow"],
  ),
  looseEvent(
    "official.account.follow.nudge.action.click",
    "official_account_follow.nudge",
    "frontend.marketing",
    ["official_account_follow"],
  ),
  looseEvent("wechat.oauth.trace", "wechat.oauth", "frontend.wechat", ["auth_funnel"]),
  looseEvent("pr.primary_cta.impression", "pr.primary_cta", "frontend.pr", [
    "pr_funnel",
    "pr_join_funnel",
  ]),
  looseEvent("pr.primary_cta.click", "pr.primary_cta", "frontend.pr", [
    "pr_funnel",
    "pr_join_funnel",
  ]),
  looseEvent("pr.lane.expand", "pr.lane", "frontend.pr", ["pr_detail_usage"]),
  looseEvent("pr.recovery.accept", "pr.recovery", "frontend.pr", ["pr_recovery"]),
  looseEvent("pr.secondary_action.click", "pr.secondary_action", "frontend.pr", [
    "pr_detail_usage",
  ]),
] as const satisfies readonly UserTelemetryEventContract[];

type RegistryEventContract = (typeof userTelemetryEventRegistry)[number];

/** Registry entries without a deprecation marker are the active contract. */
export type ActiveUserTelemetryEventContract = Exclude<
  RegistryEventContract,
  { deprecated: { replacement?: string; reason: string } }
>;

export type ActiveUserTelemetryEventName = ActiveUserTelemetryEventContract["eventName"];

export type ActiveUserTelemetryEventVersion<
  TEventName extends ActiveUserTelemetryEventName = ActiveUserTelemetryEventName,
> = Extract<ActiveUserTelemetryEventContract, { eventName: TEventName }>["eventVersion"];

export type ActiveUserTelemetryEvent = ActiveUserTelemetryEventContract extends infer TContract
  ? TContract extends ActiveUserTelemetryEventContract
    ? {
        eventName: TContract["eventName"];
        eventVersion: TContract["eventVersion"];
        eventFamily: TContract["eventFamily"];
        owner: TContract["owner"];
        attributes: z.infer<TContract["attributesSchema"]>;
        payload: z.infer<TContract["payloadSchema"]>;
      }
    : never
  : never;
