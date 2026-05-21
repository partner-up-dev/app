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

export type UserTelemetryEventKind =
  | "context"
  | "observation"
  | "intent"
  | "command_result";

export type UserTelemetryConsentClass =
  | "functional"
  | "analytics"
  | "sensitive";

export type UserTelemetryEventContract = {
  eventName: string;
  eventFamily: string;
  eventVersion: number;
  eventKind: UserTelemetryEventKind;
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
  eventKind: "context",
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
  eventKind: UserTelemetryEventKind,
  owner: string,
  biUsage: readonly string[],
): UserTelemetryEventContract => ({
  eventName,
  eventFamily,
  eventVersion: 1,
  eventKind,
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

  looseEvent("page.viewed", "page.viewed", "observation", "frontend.app", [
    "route_activity",
  ]),
  looseEvent("anchor_event.landing.viewed", "anchor_event.landing", "observation", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.recommendation.requested", "anchor_event.recommendation", "intent", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.recommendation.returned", "anchor_event.recommendation", "command_result", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.candidate.engaged", "anchor_event.candidate_engagement", "intent", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.assisted_create.started", "anchor_event.assisted_create", "intent", "frontend.event", [
    "pr_create_funnel",
  ]),
  looseEvent("anchor_event.card_stack.loaded", "anchor_event.card_stack", "observation", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.card.seen", "anchor_event.card", "observation", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.card.action_taken", "anchor_event.card", "intent", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.card_empty_create.started", "anchor_event.assisted_create", "intent", "frontend.event", [
    "pr_create_funnel",
  ]),
  looseEvent("anchor_event.list.loaded", "anchor_event.list", "observation", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.date.selected", "anchor_event.list", "intent", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.pr_row.seen", "anchor_event.pr_row", "observation", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.pr_row.action_taken", "anchor_event.pr_row", "intent", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.list_create.started", "anchor_event.assisted_create", "intent", "frontend.event", [
    "pr_create_funnel",
  ]),
  looseEvent("pr.entry.reached", "pr.entry", "observation", "frontend.pr", [
    "pr_funnel",
  ]),
  looseEvent("pr.commitment.result", "pr.commitment_result", "command_result", "frontend.pr", [
    "pr_funnel",
  ]),
  looseEvent("pr.create.result", "pr.create_result", "command_result", "frontend.pr", [
    "pr_create_funnel",
  ]),
  looseEvent("pr.join.result", "pr.join_result", "command_result", "frontend.pr", [
    "pr_join_funnel",
  ]),
  looseEvent("pr.waitlist.result", "pr.waitlist_result", "command_result", "frontend.pr", [
    "pr_join_funnel",
  ]),
  looseEvent("pr.exit.succeeded", "pr.exit_result", "command_result", "frontend.pr", [
    "pr_lifecycle_user_command",
  ]),
  looseEvent("pr.confirm.succeeded", "pr.confirm_result", "command_result", "frontend.pr", [
    "pr_lifecycle_user_command",
  ]),
  looseEvent("pr.checkin.submitted", "pr.checkin", "intent", "frontend.pr", [
    "pr_lifecycle_user_command",
  ]),
  looseEvent("pr.created", "pr.created", "command_result", "backend.pr", [
    "pr_create_funnel",
  ]),
  looseEvent("pr.joined", "pr.joined", "command_result", "backend.pr", [
    "pr_join_funnel",
  ]),
  looseEvent("pr.waitlisted", "pr.waitlisted", "command_result", "backend.pr", [
    "pr_join_funnel",
  ]),
  looseEvent("pr.closed", "pr.closed", "command_result", "backend.pr", [
    "pr_close_funnel",
  ]),
  looseEvent("share.method.switch", "share.method", "intent", "frontend.share", [
    "share_usage",
  ]),
  looseEvent("share.link.native.success", "share.link", "command_result", "frontend.share", [
    "share_usage",
  ]),
  looseEvent("share.link.copy.success", "share.link", "command_result", "frontend.share", [
    "share_usage",
  ]),
  looseEvent("share.link.failed", "share.link", "command_result", "frontend.share", [
    "share_usage",
  ]),
  looseEvent("share.session.started", "share.session", "observation", "frontend.share", [
    "share_usage",
  ]),
  looseEvent("share.descriptor.submitted", "share.descriptor", "intent", "frontend.share", [
    "share_usage",
  ]),
  looseEvent("share.descriptor.discarded.stale", "share.descriptor", "observation", "frontend.share", [
    "share_usage",
  ]),
  looseEvent("share.apply.fallback.success", "share.apply", "command_result", "frontend.share", [
    "share_usage",
  ]),
  looseEvent("share.apply.base.success", "share.apply", "command_result", "frontend.share", [
    "share_usage",
  ]),
  looseEvent("share.apply.enriched.success", "share.apply", "command_result", "frontend.share", [
    "share_usage",
  ]),
  looseEvent("share.apply.failed", "share.apply", "command_result", "frontend.share", [
    "share_usage",
  ]),
  looseEvent("share.replay.triggered", "share.replay", "intent", "frontend.share", [
    "share_usage",
  ]),
  looseEvent("home.hero.primary.click", "home.navigation", "intent", "frontend.home", [
    "home_conversion",
  ]),
  looseEvent("home.event.section.impression", "home.event_discovery", "observation", "frontend.home", [
    "home_conversion",
  ]),
  looseEvent("home.event.card.impression", "home.event_discovery", "observation", "frontend.home", [
    "home_conversion",
  ]),
  looseEvent("home.event.card.click", "home.event_discovery", "intent", "frontend.home", [
    "home_conversion",
  ]),
  looseEvent("home.event.all.click", "home.event_discovery", "intent", "frontend.home", [
    "view_other_activities",
  ]),
  looseEvent("home.event.highlight.click", "home.event_discovery", "intent", "frontend.home", [
    "home_conversion",
  ]),
  looseEvent("home.event.plaza.entry.click", "home.event_discovery", "intent", "frontend.home", [
    "view_other_activities",
  ]),
  looseEvent("home.create.entry.click", "home.create_entry", "intent", "frontend.home", [
    "pr_create_funnel",
  ]),
  looseEvent("official.account.follow.nudge.shown", "official_account_follow.nudge", "observation", "frontend.marketing", [
    "official_account_follow",
  ]),
  looseEvent("official.account.follow.nudge.action.click", "official_account_follow.nudge", "intent", "frontend.marketing", [
    "official_account_follow",
  ]),
  looseEvent("wechat.oauth.trace", "wechat.oauth", "observation", "frontend.wechat", [
    "auth_funnel",
  ]),
  looseEvent("anchor_event.form.impression", "anchor_event.form", "observation", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.form.started", "anchor_event.form", "intent", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.form.recommendation_impression", "anchor_event.form", "observation", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.recommendation.result", "anchor_event.recommendation", "command_result", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.form_result.action_clicked", "anchor_event.form_result", "intent", "frontend.event", [
    "anchor_event_funnel",
  ]),
  looseEvent("anchor_event.form.create_fallback_clicked", "anchor_event.assisted_create", "intent", "frontend.event", [
    "pr_create_funnel",
  ]),
  looseEvent("anchor_event.assisted_create.result", "anchor_event.assisted_create", "command_result", "frontend.event", [
    "pr_create_funnel",
  ]),
  looseEvent("pr.primary_cta.impression", "pr.primary_cta", "observation", "frontend.pr", [
    "pr_funnel",
  ]),
  looseEvent("pr.primary_cta.click", "pr.primary_cta", "intent", "frontend.pr", [
    "pr_funnel",
  ]),
  looseEvent("pr.lane.expand", "pr.lane", "intent", "frontend.pr", [
    "pr_detail_usage",
  ]),
  looseEvent("pr.recovery.accept", "pr.recovery", "intent", "frontend.pr", [
    "pr_recovery",
  ]),
  looseEvent("pr.secondary_action.click", "pr.secondary_action", "intent", "frontend.pr", [
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
