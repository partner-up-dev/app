import assert from "node:assert/strict";
import { test } from "vitest";
import {
  buildPRJoinFunnelResponseFromRows,
  resolvePRJoinFunnelFilters,
  type PRJoinFunnelFilters,
} from "./pr-join-funnel.model";
import type {
  UserTelemetryContextStatus,
  UserTelemetryEnrichedEventRow,
} from "./user-event-projection";

const filters: PRJoinFunnelFilters = resolvePRJoinFunnelFilters({
  startAt: new Date("2026-05-01T00:00:00.000Z"),
  endAt: new Date("2026-05-08T00:00:00.000Z"),
});

const buildEvent = (input: {
  eventName: string;
  journeyId: string;
  payload?: Record<string, unknown>;
  routeContextStatus?: UserTelemetryContextStatus;
  authContextStatus?: UserTelemetryContextStatus;
  anonymousId?: string | null;
  authenticatedUserHash?: string | null;
}): UserTelemetryEnrichedEventRow => ({
  eventId: `${input.journeyId}:${input.eventName}`,
  eventName: input.eventName,
  eventVersion: 1,
  eventFamily: input.eventName,
  eventOwner: "test",
  biUsage: ["pr_join_funnel"],
  journeyId: input.journeyId,
  traceId: null,
  attributes: {},
  payload: input.payload ?? {},
  occurredAt: new Date("2026-05-02T00:00:00.000Z"),
  routePath: "/pr/1",
  routeName: "pr-detail",
  spm: "test.spm",
  sourceQr: null,
  anonymousId: input.anonymousId ?? "anon",
  authenticatedUserHash: input.authenticatedUserHash ?? null,
  routeContextStatus: input.routeContextStatus ?? "context_complete",
  authContextStatus: input.authContextStatus ?? "context_complete",
});

test("buildPRJoinFunnelResponseFromRows projects join behavior through enriched events", () => {
  const response = buildPRJoinFunnelResponseFromRows(filters, [
    buildEvent({
      journeyId: "journey-auth",
      eventName: "pr.primary_cta.impression",
      authenticatedUserHash: "user-hash",
      payload: { ctaType: "JOIN" },
    }),
    buildEvent({
      journeyId: "journey-auth",
      eventName: "pr.primary_cta.click",
      authenticatedUserHash: "user-hash",
      payload: { ctaType: "JOIN" },
    }),
    buildEvent({
      journeyId: "journey-auth",
      eventName: "pr.join.result",
      authenticatedUserHash: "user-hash",
      payload: { actionResult: "success" },
    }),
    buildEvent({
      journeyId: "journey-auth",
      eventName: "pr.joined",
      authenticatedUserHash: "user-hash",
      payload: { result_status: "success" },
    }),
    buildEvent({
      journeyId: "journey-anon",
      eventName: "pr.primary_cta.impression",
      payload: { ctaType: "JOIN" },
    }),
    buildEvent({
      journeyId: "journey-anon",
      eventName: "pr.primary_cta.click",
      payload: { ctaType: "JOIN" },
    }),
    buildEvent({
      journeyId: "journey-anon",
      eventName: "pr.join.result",
      payload: { actionResult: "blocked" },
    }),
    buildEvent({
      journeyId: "journey-unknown-context",
      eventName: "pr.primary_cta.click",
      routeContextStatus: "context_unknown",
      authContextStatus: "context_unknown",
      anonymousId: null,
      payload: { ctaType: "JOIN" },
    }),
    buildEvent({
      journeyId: "journey-waitlist",
      eventName: "pr.primary_cta.impression",
      payload: { ctaType: "WAITLIST" },
    }),
  ]);

  assert.deepEqual(response.summary, {
    impressionJourneys: 2,
    clickJourneys: 3,
    frontendSuccessJourneys: 1,
    backendJoinedJourneys: 1,
    impressionToBackendJoinRate: 0.5,
    clickToBackendJoinRate: 1 / 3,
  });

  assert.deepEqual(
    response.steps.map((step) => ({
      stepKey: step.stepKey,
      journeyCount: step.journeyCount,
      eventCount: step.eventCount,
      conversionFromPrevious: step.conversionFromPrevious,
      conversionFromStart: step.conversionFromStart,
    })),
    [
      {
        stepKey: "join_cta_impression",
        journeyCount: 2,
        eventCount: 2,
        conversionFromPrevious: null,
        conversionFromStart: 1,
      },
      {
        stepKey: "join_cta_click",
        journeyCount: 3,
        eventCount: 3,
        conversionFromPrevious: 1.5,
        conversionFromStart: 1.5,
      },
      {
        stepKey: "frontend_join_success",
        journeyCount: 1,
        eventCount: 1,
        conversionFromPrevious: 1 / 3,
        conversionFromStart: 0.5,
      },
      {
        stepKey: "backend_joined",
        journeyCount: 1,
        eventCount: 1,
        conversionFromPrevious: 1,
        conversionFromStart: 0.5,
      },
    ],
  );

  assert.deepEqual(response.identity, {
    authenticatedJourneys: 1,
    anonymousOnlyJourneys: 2,
    unknownSessionJourneys: 1,
  });
  assert.deepEqual(response.context, {
    eventCount: 9,
    routeContextUnknownEvents: 1,
    authContextUnknownEvents: 1,
  });
  assert.deepEqual(
    response.eventDictionary.map((entry) => entry.eventName),
    [
      "pr.join.result",
      "pr.joined",
      "pr.primary_cta.click",
      "pr.primary_cta.impression",
    ],
  );
});

test("resolvePRJoinFunnelFilters applies the seven day default window", () => {
  assert.deepEqual(
    resolvePRJoinFunnelFilters({
      endAt: new Date("2026-05-08T00:00:00.000Z"),
    }),
    {
      startAt: "2026-05-01T00:00:00.000Z",
      endAt: "2026-05-08T00:00:00.000Z",
    },
  );
});
