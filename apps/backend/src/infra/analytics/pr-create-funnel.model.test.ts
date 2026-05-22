import assert from "node:assert/strict";
import { test } from "vitest";
import {
  buildPRCreateFunnelResponseFromRows,
  resolvePRCreateFunnelFilters,
  type PRCreateFunnelFilters,
} from "./pr-create-funnel.model";
import type {
  UserTelemetryContextStatus,
  UserTelemetryEnrichedEventRow,
} from "./user-event-projection";

const filters: PRCreateFunnelFilters = resolvePRCreateFunnelFilters({
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
  biUsage: ["pr_create_funnel"],
  journeyId: input.journeyId,
  traceId: null,
  attributes: {},
  payload: input.payload ?? {},
  occurredAt: new Date("2026-05-02T00:00:00.000Z"),
  routePath: "/pr/new",
  routeName: "pr-create",
  spm: "test.spm",
  sourceQr: null,
  anonymousId: input.anonymousId ?? "anon",
  authenticatedUserHash: input.authenticatedUserHash ?? null,
  routeContextStatus: input.routeContextStatus ?? "context_complete",
  authContextStatus: input.authContextStatus ?? "context_complete",
});

test("buildPRCreateFunnelResponseFromRows projects create behavior through enriched events", () => {
  const response = buildPRCreateFunnelResponseFromRows(filters, [
    buildEvent({
      journeyId: "journey-form",
      eventName: "home.create.entry.click",
      authenticatedUserHash: "user-hash",
    }),
    buildEvent({
      journeyId: "journey-form",
      eventName: "pr.create.result",
      authenticatedUserHash: "user-hash",
      payload: { actionResult: "success" },
    }),
    buildEvent({
      journeyId: "journey-form",
      eventName: "pr.created",
      authenticatedUserHash: "user-hash",
      payload: { creation_path: "form" },
    }),
    buildEvent({
      journeyId: "journey-assisted",
      eventName: "anchor_event.assisted_create.started",
    }),
    buildEvent({
      journeyId: "journey-assisted",
      eventName: "anchor_event.assisted_create.result",
      payload: { actionResult: "success" },
    }),
    buildEvent({
      journeyId: "journey-assisted",
      eventName: "pr.created",
      payload: { creation_path: "event_assisted" },
    }),
    buildEvent({
      journeyId: "journey-blocked",
      eventName: "home.create.entry.click",
      routeContextStatus: "context_unknown",
      authContextStatus: "context_unknown",
      anonymousId: null,
    }),
    buildEvent({
      journeyId: "journey-blocked",
      eventName: "pr.create.result",
      routeContextStatus: "context_unknown",
      authContextStatus: "context_unknown",
      anonymousId: null,
      payload: { actionResult: "blocked" },
    }),
    buildEvent({
      journeyId: "journey-nl",
      eventName: "pr.created",
      payload: { creation_path: "natural_language" },
    }),
  ]);

  assert.deepEqual(response.summary, {
    entryJourneys: 3,
    frontendSuccessJourneys: 2,
    backendCreatedJourneys: 3,
    entryToBackendCreatedRate: 1,
    frontendSuccessToBackendCreatedRate: 1.5,
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
        stepKey: "create_entry_intent",
        journeyCount: 3,
        eventCount: 3,
        conversionFromPrevious: null,
        conversionFromStart: 1,
      },
      {
        stepKey: "frontend_create_success",
        journeyCount: 2,
        eventCount: 2,
        conversionFromPrevious: 2 / 3,
        conversionFromStart: 2 / 3,
      },
      {
        stepKey: "backend_created",
        journeyCount: 3,
        eventCount: 3,
        conversionFromPrevious: 1.5,
        conversionFromStart: 1,
      },
    ],
  );

  assert.deepEqual(response.paths, [
    { creationPath: "form", journeyCount: 1, eventCount: 1 },
    { creationPath: "event_assisted", journeyCount: 1, eventCount: 1 },
    { creationPath: "natural_language", journeyCount: 1, eventCount: 1 },
  ]);
  assert.deepEqual(response.identity, {
    authenticatedJourneys: 1,
    anonymousOnlyJourneys: 2,
    unknownSessionJourneys: 1,
  });
  assert.deepEqual(response.context, {
    eventCount: 9,
    routeContextUnknownEvents: 2,
    authContextUnknownEvents: 2,
  });
  assert.deepEqual(
    response.eventDictionary.map((entry) => entry.eventName),
    [
      "anchor_event.assisted_create.result",
      "anchor_event.assisted_create.started",
      "anchor_event.card_empty_create.started",
      "anchor_event.form.create_fallback_clicked",
      "anchor_event.list_create.started",
      "home.create.entry.click",
      "pr.create.result",
      "pr.created",
    ],
  );
});

test("resolvePRCreateFunnelFilters applies the seven day default window", () => {
  assert.deepEqual(
    resolvePRCreateFunnelFilters({
      endAt: new Date("2026-05-08T00:00:00.000Z"),
    }),
    {
      startAt: "2026-05-01T00:00:00.000Z",
      endAt: "2026-05-08T00:00:00.000Z",
    },
  );
});
