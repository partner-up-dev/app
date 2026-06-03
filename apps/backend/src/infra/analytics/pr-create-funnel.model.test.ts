import assert from "node:assert/strict";
import { test } from "vitest";
import {
  buildPRCreateFunnelResponseFromRows,
  resolvePRCreateFunnelFilters,
  type PRCreateFunnelContextStatus,
  type PRCreateFunnelFactRow,
  type PRCreateFunnelFilters,
  type PRCreatePath,
} from "./pr-create-funnel.model";

const filters: PRCreateFunnelFilters = resolvePRCreateFunnelFilters({
  startAt: new Date("2026-05-01T00:00:00.000Z"),
  endAt: new Date("2026-05-08T00:00:00.000Z"),
});

const buildEvent = (input: {
  eventName: string;
  journeyId: string;
  stepKey: string | null;
  creationPath?: PRCreatePath | null;
  routeContextStatus?: PRCreateFunnelContextStatus;
  authContextStatus?: PRCreateFunnelContextStatus;
  anonymousId?: string | null;
  authenticatedUserHash?: string | null;
}): PRCreateFunnelFactRow => ({
  eventId: `${input.journeyId}:${input.eventName}`,
  eventName: input.eventName,
  eventVersion: 1,
  journeyId: input.journeyId,
  traceId: null,
  occurredAt: new Date("2026-05-02T00:00:00.000Z"),
  anonymousId: input.anonymousId ?? "anon",
  authenticatedUserHash: input.authenticatedUserHash ?? null,
  routeContextStatus: input.routeContextStatus ?? "context_complete",
  authContextStatus: input.authContextStatus ?? "context_complete",
  stepKey: input.stepKey,
  creationPath: input.creationPath ?? null,
});

test("buildPRCreateFunnelResponseFromRows projects create behavior through enriched events", () => {
  const response = buildPRCreateFunnelResponseFromRows(filters, [
    buildEvent({
      journeyId: "journey-form",
      eventName: "home.create.entry.click",
      authenticatedUserHash: "user-hash",
      stepKey: "create_entry_intent",
    }),
    buildEvent({
      journeyId: "journey-form",
      eventName: "pr.create.result",
      authenticatedUserHash: "user-hash",
      stepKey: "frontend_create_success",
    }),
    buildEvent({
      journeyId: "journey-form",
      eventName: "pr.created",
      authenticatedUserHash: "user-hash",
      stepKey: "backend_created",
      creationPath: "form",
    }),
    buildEvent({
      journeyId: "journey-assisted",
      eventName: "anchor_event.assisted_create.started",
      stepKey: "create_entry_intent",
    }),
    buildEvent({
      journeyId: "journey-assisted",
      eventName: "anchor_event.assisted_create.result",
      stepKey: "frontend_create_success",
    }),
    buildEvent({
      journeyId: "journey-assisted",
      eventName: "pr.created",
      stepKey: "backend_created",
      creationPath: "event_assisted",
    }),
    buildEvent({
      journeyId: "journey-blocked",
      eventName: "home.create.entry.click",
      routeContextStatus: "context_unknown",
      authContextStatus: "context_unknown",
      anonymousId: null,
      stepKey: "create_entry_intent",
    }),
    buildEvent({
      journeyId: "journey-blocked",
      eventName: "pr.create.result",
      routeContextStatus: "context_unknown",
      authContextStatus: "context_unknown",
      anonymousId: null,
      stepKey: null,
    }),
    buildEvent({
      journeyId: "journey-nl",
      eventName: "pr.created",
      stepKey: "backend_created",
      creationPath: "natural_language",
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
