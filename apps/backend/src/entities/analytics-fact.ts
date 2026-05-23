import {
  integer,
  jsonb,
  pgView,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const factPRJoinFunnelEvents = pgView("fact_pr_join_funnel_event", {
  eventId: uuid("event_id").notNull(),
  eventName: text("event_name").notNull(),
  eventVersion: integer("event_version").notNull(),
  journeyId: uuid("journey_id").notNull(),
  traceId: text("trace_id"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  routePath: text("route_path"),
  routeName: text("route_name"),
  spm: text("spm"),
  sourceQr: text("source_qr"),
  anonymousId: text("anonymous_id"),
  authenticatedUserHash: text("authenticated_user_hash"),
  routeContextStatus: text("route_context_status").notNull(),
  authContextStatus: text("auth_context_status").notNull(),
  stepKey: text("step_key"),
}).existing();

export const factPRCreateFunnelEvents = pgView("fact_pr_create_funnel_event", {
  eventId: uuid("event_id").notNull(),
  eventName: text("event_name").notNull(),
  eventVersion: integer("event_version").notNull(),
  journeyId: uuid("journey_id").notNull(),
  traceId: text("trace_id"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  routePath: text("route_path"),
  routeName: text("route_name"),
  spm: text("spm"),
  sourceQr: text("source_qr"),
  anonymousId: text("anonymous_id"),
  authenticatedUserHash: text("authenticated_user_hash"),
  routeContextStatus: text("route_context_status").notNull(),
  authContextStatus: text("auth_context_status").notNull(),
  stepKey: text("step_key"),
  creationPath: text("creation_path"),
}).existing();

export const factUserRetentionActivityEvents = pgView(
  "fact_user_retention_activity_event",
  {
    eventId: uuid("event_id").notNull(),
    eventName: text("event_name").notNull(),
    journeyId: uuid("journey_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    anonymousId: text("anonymous_id"),
    authenticatedUserHash: text("authenticated_user_hash"),
    identityKey: text("identity_key"),
  },
).existing();

export const factAnchorEventTransitionEvents = pgView(
  "fact_anchor_event_transition_event",
  {
    eventId: uuid("event_id").notNull(),
    journeyId: uuid("journey_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    anonymousId: text("anonymous_id"),
    authenticatedUserHash: text("authenticated_user_hash"),
    identityKey: text("identity_key"),
    activityType: text("activity_type").notNull(),
  },
).existing();

export const factViewOtherAnchorEventsConversionEvents = pgView(
  "fact_view_other_anchor_events_conversion_event",
  {
    eventId: uuid("event_id").notNull(),
    eventName: text("event_name").notNull(),
    journeyId: uuid("journey_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    anonymousId: text("anonymous_id"),
    authenticatedUserHash: text("authenticated_user_hash"),
    identityKey: text("identity_key"),
  },
).existing();

export const factAnchorEventFunnelSegments = pgView(
  "fact_anchor_event_funnel_segment",
  {
    segmentId: text("segment_id"),
    journeyId: uuid("journey_id").notNull(),
    renderedMode: text("rendered_mode"),
    startSpm: text("start_spm"),
    sourceQr: text("source_qr"),
    assignmentRevision: text("assignment_revision"),
    anchorEventId: integer("anchor_event_id"),
    contextOccurredAt: timestamp("context_occurred_at", {
      withTimezone: true,
    }).notNull(),
  },
).existing();

export const factAnchorEventFunnelEvents = pgView(
  "fact_anchor_event_funnel_event",
  {
    eventId: uuid("event_id").notNull(),
    eventName: text("event_name").notNull(),
    journeyId: uuid("journey_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    segmentId: text("segment_id"),
    renderedMode: text("rendered_mode"),
    startSpm: text("start_spm"),
    sourceQr: text("source_qr"),
    assignmentRevision: text("assignment_revision"),
    anchorEventId: integer("anchor_event_id"),
    contextOccurredAt: timestamp("context_occurred_at", {
      withTimezone: true,
    }).notNull(),
    payload: jsonb("payload").$type<unknown>(),
  },
).existing();

export const factOfficialAccountFollowNudgeEvents = pgView(
  "fact_official_account_follow_nudge_event",
  {
    eventId: uuid("event_id").notNull(),
    eventName: text("event_name").notNull(),
    journeyId: uuid("journey_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    source: text("source"),
    action: text("action"),
    anchorEventId: integer("anchor_event_id"),
    spm: text("spm"),
    sourceQr: text("source_qr"),
    assignmentRevision: text("assignment_revision"),
    renderedMode: text("rendered_mode"),
  },
).existing();
