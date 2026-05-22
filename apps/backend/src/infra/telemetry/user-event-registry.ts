import { z } from "zod";

export const userTelemetryAttributeValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const userTelemetryAttributesSchema = z.record(
  userTelemetryAttributeValueSchema,
);

export const userTelemetryPayloadSchema = z.record(z.unknown());

export type UserTelemetryAttributes = z.infer<
  typeof userTelemetryAttributesSchema
>;

export type UserTelemetryPayload = z.infer<typeof userTelemetryPayloadSchema>;

export type UserTelemetryConsentClass =
  | "functional"
  | "analytics"
  | "sensitive";

export type UserTelemetryEventContract = {
  eventName: string;
  eventFamily: string;
  eventVersion: number;
  owner: string;
  trigger: string;
  forbidden: string;
  attributesSchema: z.ZodType<UserTelemetryAttributes>;
  payloadSchema: z.ZodType<UserTelemetryPayload>;
  consentClass: UserTelemetryConsentClass;
  biUsage: readonly string[];
  deprecated?: {
    replacement?: string;
    reason: string;
  };
};

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

const contextEvent = (
  eventName: string,
  eventFamily: string,
  trigger: string,
  biUsage: readonly string[],
): UserTelemetryEventContract => ({
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

const looseEvent = (
  eventName: string,
  eventFamily: string,
  owner: string,
  biUsage: readonly string[],
): UserTelemetryEventContract => ({
  eventName,
  eventFamily,
  eventVersion: 1,
  owner,
  trigger: "Registered legacy-compatible event. Call-site trigger must be documented before semantic version changes.",
  forbidden: "Do not emit for automatic system lifecycle facts.",
  attributesSchema: looseAttributesSchema,
  payloadSchema: loosePayloadSchema,
  consentClass: "analytics",
  biUsage,
});

const userTelemetryEventRegistry = [
  contextEvent("journey.started", "journey.lifecycle", "A new application activity journey starts.", [
    "journey_context",
    "retention",
  ]),
  contextEvent("journey.ended", "journey.lifecycle", "An application activity journey ends or times out.", [
    "journey_context",
  ]),
  contextEvent("route.entered", "route.lifecycle", "The frontend enters a route inside the current journey.", [
    "route_context",
    "funnel_context",
  ]),
  contextEvent("route.left", "route.lifecycle", "The frontend leaves a route inside the current journey.", [
    "route_context",
  ]),
  contextEvent("auth.session.created", "auth.session", "A browser auth session is created or refreshed with identity context.", [
    "identity_context",
    "retention",
  ]),
  contextEvent("consent.changed", "consent.lifecycle", "The user's analytics consent state changes.", [
    "consent_context",
  ]),
  contextEvent("experiment.assigned", "experiment.assignment", "The user is assigned to an experiment variant.", [
    "experiment_context",
  ]),
  contextEvent("visibility.changed", "browser.visibility", "The page visibility state changes.", [
    "runtime_context",
  ]),
  contextEvent("network.changed", "browser.network", "The browser network state changes.", [
    "runtime_context",
  ]),
  {
    ...contextEvent("segment.started", "legacy.segment", "Legacy v1 segment context was reconstructed during migration.", [
      "legacy_migration",
    ]),
    deprecated: {
      reason: "Segments are retired from the target telemetry model.",
    },
  },
  {
    ...contextEvent("segment.ended", "legacy.segment", "Legacy v1 segment end context was reconstructed during migration.", [
      "legacy_migration",
    ]),
    deprecated: {
      reason: "Segments are retired from the target telemetry model.",
    },
  },

  looseEvent("page.viewed", "page.viewed", "frontend.app", [
    "route_activity",
  ]),
  looseEvent("anchor_event.landing.viewed", "anchor_event.landing", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.recommendation.requested", "anchor_event.recommendation", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.recommendation.returned", "anchor_event.recommendation", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.candidate.engaged", "anchor_event.candidate_engagement", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.assisted_create.started", "anchor_event.assisted_create", "frontend.event", [
    "pr_create_funnel",
  ]),
  looseEvent("anchor_event.card_stack.loaded", "anchor_event.card_stack", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.card.seen", "anchor_event.card", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.card.action_taken", "anchor_event.card", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.card_empty_create.started", "anchor_event.assisted_create", "frontend.event", [
    "pr_create_funnel",
  ]),
  looseEvent("anchor_event.list.loaded", "anchor_event.list", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.date.selected", "anchor_event.list", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.pr_row.seen", "anchor_event.pr_row", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.pr_row.action_taken", "anchor_event.pr_row", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.list_create.started", "anchor_event.assisted_create", "frontend.event", [
    "pr_create_funnel",
  ]),
  looseEvent("pr.entry.reached", "pr.entry", "frontend.pr", [
    "pr_funnel",
  ]),
  looseEvent("pr.commitment.result", "pr.commitment_result", "frontend.pr", [
    "pr_funnel",
  ]),
  looseEvent("pr.create.result", "pr.create_result", "frontend.pr", [
    "pr_create_funnel",
  ]),
  looseEvent("pr.join.result", "pr.join_result", "frontend.pr", [
    "pr_join_funnel",
  ]),
  looseEvent("pr.waitlist.result", "pr.waitlist_result", "frontend.pr", [
    "pr_join_funnel",
  ]),
  looseEvent("pr.exit.succeeded", "pr.exit_result", "frontend.pr", [
    "pr_lifecycle_user_command",
  ]),
  looseEvent("pr.confirm.succeeded", "pr.confirm_result", "frontend.pr", [
    "pr_lifecycle_user_command",
  ]),
  looseEvent("pr.checkin.submitted", "pr.checkin", "frontend.pr", [
    "pr_lifecycle_user_command",
  ]),
  looseEvent("pr.created", "pr.created", "backend.pr", [
    "pr_create_funnel",
  ]),
  looseEvent("pr.joined", "pr.joined", "backend.pr", [
    "pr_join_funnel",
  ]),
  looseEvent("pr.waitlisted", "pr.waitlisted", "backend.pr", [
    "pr_join_funnel",
  ]),
  looseEvent("pr.closed", "pr.closed", "backend.pr", [
    "pr_close_funnel",
  ]),
  looseEvent("share.method.switch", "share.method", "frontend.share", [
    "share_usage",
  ]),
  looseEvent("share.link.native.success", "share.link", "frontend.share", [
    "share_usage",
  ]),
  looseEvent("share.link.copy.success", "share.link", "frontend.share", [
    "share_usage",
  ]),
  looseEvent("share.link.failed", "share.link", "frontend.share", [
    "share_usage",
  ]),
  looseEvent("share.session.started", "share.session", "frontend.share", [
    "share_usage",
  ]),
  looseEvent("share.descriptor.submitted", "share.descriptor", "frontend.share", [
    "share_usage",
  ]),
  looseEvent("share.descriptor.discarded.stale", "share.descriptor", "frontend.share", [
    "share_usage",
  ]),
  looseEvent("share.apply.fallback.success", "share.apply", "frontend.share", [
    "share_usage",
  ]),
  looseEvent("share.apply.base.success", "share.apply", "frontend.share", [
    "share_usage",
  ]),
  looseEvent("share.apply.enriched.success", "share.apply", "frontend.share", [
    "share_usage",
  ]),
  looseEvent("share.apply.failed", "share.apply", "frontend.share", [
    "share_usage",
  ]),
  looseEvent("share.replay.triggered", "share.replay", "frontend.share", [
    "share_usage",
  ]),
  looseEvent("home.hero.primary.click", "home.navigation", "frontend.home", [
    "home_conversion",
  ]),
  looseEvent("home.event.section.impression", "home.event_discovery", "frontend.home", [
    "home_conversion",
  ]),
  looseEvent("home.event.card.impression", "home.event_discovery", "frontend.home", [
    "home_conversion",
  ]),
  looseEvent("home.event.card.click", "home.event_discovery", "frontend.home", [
    "home_conversion",
  ]),
  looseEvent("home.event.all.click", "home.event_discovery", "frontend.home", [
    "view_other_activities",
  ]),
  looseEvent("home.event.highlight.click", "home.event_discovery", "frontend.home", [
    "home_conversion",
  ]),
  looseEvent("home.event.plaza.entry.click", "home.event_discovery", "frontend.home", [
    "view_other_activities",
  ]),
  looseEvent("home.create.entry.click", "home.create_entry", "frontend.home", [
    "pr_create_funnel",
  ]),
  looseEvent("official.account.follow.nudge.shown", "official_account_follow.nudge", "frontend.marketing", [
    "official_account_follow",
  ]),
  looseEvent("official.account.follow.nudge.action.click", "official_account_follow.nudge", "frontend.marketing", [
    "official_account_follow",
  ]),
  looseEvent("wechat.oauth.trace", "wechat.oauth", "frontend.wechat", [
    "auth_funnel",
  ]),
  looseEvent("anchor_event.form.impression", "anchor_event.form", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.form.started", "anchor_event.form", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.form.recommendation_impression", "anchor_event.form", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.recommendation.result", "anchor_event.recommendation", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.form_result.action_clicked", "anchor_event.form_result", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.form.create_fallback_clicked", "anchor_event.assisted_create", "frontend.event", [
    "pr_create_funnel",
  ]),
  looseEvent("anchor_event.assisted_create.result", "anchor_event.assisted_create", "frontend.event", [
    "pr_create_funnel",
  ]),
  looseEvent("pr.primary_cta.impression", "pr.primary_cta", "frontend.pr", [
    "pr_funnel",
  ]),
  looseEvent("pr.primary_cta.click", "pr.primary_cta", "frontend.pr", [
    "pr_funnel",
  ]),
  looseEvent("pr.lane.expand", "pr.lane", "frontend.pr", [
    "pr_detail_usage",
  ]),
  looseEvent("pr.recovery.accept", "pr.recovery", "frontend.pr", [
    "pr_recovery",
  ]),
  looseEvent("pr.secondary_action.click", "pr.secondary_action", "frontend.pr", [
    "pr_detail_usage",
  ]),
] as const satisfies readonly UserTelemetryEventContract[];

const registryByKey = new Map<string, UserTelemetryEventContract>();

for (const contract of userTelemetryEventRegistry) {
  const key = buildRegistryKey(contract.eventName, contract.eventVersion);
  const existing = registryByKey.get(key);
  if (existing) {
    throw new Error(
      `Duplicate user telemetry event contract ${contract.eventName}@${contract.eventVersion}`,
    );
  }
  registryByKey.set(key, contract);
}

export const getUserTelemetryEventRegistry = ():
  readonly UserTelemetryEventContract[] => userTelemetryEventRegistry;

export const getUserTelemetryEventContract = (
  eventName: string,
  eventVersion: number,
): UserTelemetryEventContract | null =>
  registryByKey.get(buildRegistryKey(eventName, eventVersion)) ?? null;

export const validateRegisteredUserTelemetryEvent = (input: {
  eventName: string;
  eventVersion: number;
  eventFamily?: string | null;
  attributes?: unknown;
  payload?: unknown;
}): UserTelemetryRegistryValidationResult => {
  const contract = getUserTelemetryEventContract(
    input.eventName,
    input.eventVersion,
  );
  if (!contract) {
    return {
      ok: false,
      failureCode: "UNREGISTERED_EVENT",
      failureMessage: `User telemetry event ${input.eventName}@${input.eventVersion} is not registered`,
    };
  }

  if (input.eventFamily && input.eventFamily !== contract.eventFamily) {
    return {
      ok: false,
      failureCode: "EVENT_FAMILY_MISMATCH",
      failureMessage: `Event family ${input.eventFamily} does not match registry family ${contract.eventFamily}`,
    };
  }

  const attributes = contract.attributesSchema.safeParse(
    input.attributes ?? {},
  );
  if (!attributes.success) {
    return {
      ok: false,
      failureCode: "INVALID_ATTRIBUTES",
      failureMessage: attributes.error.issues
        .map((issue) => issue.message)
        .join("; "),
    };
  }

  const payload = contract.payloadSchema.safeParse(input.payload ?? {});
  if (!payload.success) {
    return {
      ok: false,
      failureCode: "INVALID_PAYLOAD",
      failureMessage: payload.error.issues
        .map((issue) => issue.message)
        .join("; "),
    };
  }

  return {
    ok: true,
    contract,
    attributes: attributes.data,
    payload: payload.data,
  };
};

function buildRegistryKey(eventName: string, eventVersion: number): string {
  return `${eventName}@${eventVersion}`;
}
