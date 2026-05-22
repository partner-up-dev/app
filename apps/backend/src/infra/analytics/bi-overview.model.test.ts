import assert from "node:assert/strict";
import { test } from "vitest";
import {
  buildBIOverviewResponse,
  resolveBIOverviewFilters,
  type BIOverviewFilters,
} from "./bi-overview.model";
import type { UserTelemetryEnrichedEventRow } from "./user-event-projection";

const filters: BIOverviewFilters = resolveBIOverviewFilters({
  startAt: new Date("2026-05-01T00:00:00.000Z"),
  endAt: new Date("2026-05-08T00:00:00.000Z"),
});

const buildEvent = (input: {
  eventName: string;
  journeyId: string;
  eventId?: string;
  occurredAt: string;
  anonymousId?: string | null;
  authenticatedUserHash?: string | null;
  payload?: Record<string, unknown>;
}): UserTelemetryEnrichedEventRow => ({
  eventId: input.eventId ?? `${input.journeyId}:${input.eventName}:${input.occurredAt}`,
  eventName: input.eventName,
  eventVersion: 1,
  eventFamily: input.eventName,
  eventOwner: "test",
  biUsage: [],
  journeyId: input.journeyId,
  traceId: null,
  attributes: {},
  payload: input.payload ?? {},
  occurredAt: new Date(input.occurredAt),
  routePath: "/",
  routeName: null,
  spm: null,
  sourceQr: null,
  anonymousId: input.anonymousId ?? "anon",
  authenticatedUserHash: input.authenticatedUserHash ?? null,
  routeContextStatus: "context_complete",
  authContextStatus: "context_complete",
});

test("buildBIOverviewResponse aggregates retention, PR facts, transitions, and view-other conversion", () => {
  const retentionEvents = [
    buildEvent({
      journeyId: "journey-a-1",
      eventName: "page.viewed",
      occurredAt: "2026-05-01T04:00:00.000Z",
      authenticatedUserHash: "user-a",
    }),
    buildEvent({
      journeyId: "journey-a-2",
      eventName: "page.viewed",
      occurredAt: "2026-05-03T04:00:00.000Z",
      authenticatedUserHash: "user-a",
    }),
    buildEvent({
      journeyId: "journey-b-1",
      eventName: "page.viewed",
      occurredAt: "2026-05-01T05:00:00.000Z",
      anonymousId: "anon-b",
    }),
    buildEvent({
      journeyId: "journey-b-2",
      eventName: "page.viewed",
      occurredAt: "2026-05-07T05:00:00.000Z",
      anonymousId: "anon-b",
    }),
  ];

  const behaviorEvents = [
    buildEvent({
      journeyId: "journey-a-1",
      eventName: "home.event.all.click",
      occurredAt: "2026-05-01T04:10:00.000Z",
      authenticatedUserHash: "user-a",
    }),
    buildEvent({
      journeyId: "journey-a-1",
      eventName: "anchor_event.landing.viewed",
      occurredAt: "2026-05-01T04:12:00.000Z",
      authenticatedUserHash: "user-a",
      payload: { activityType: "badminton" },
    }),
    buildEvent({
      journeyId: "journey-a-2",
      eventName: "anchor_event.landing.viewed",
      occurredAt: "2026-05-03T04:12:00.000Z",
      authenticatedUserHash: "user-a",
      payload: { activityType: "running" },
    }),
    buildEvent({
      journeyId: "journey-b-1",
      eventName: "home.event.all.click",
      occurredAt: "2026-05-01T05:10:00.000Z",
      anonymousId: "anon-b",
    }),
  ];

  const response = buildBIOverviewResponse({
    filters,
    retentionEvents,
    behaviorEvents,
    userPRCountRows: [
      { userKey: "user-a", createdCount: 2, joinedCount: 1 },
      { userKey: "user-b", createdCount: 0, joinedCount: 2 },
    ],
    prLifecycleCreatedAtStatusRows: [
      { status: "OPEN", count: 2 },
      { status: "READY", count: 1 },
      { status: "CLOSED", count: 1 },
      { status: "EXPIRED", count: 1 },
    ],
    prLifecycleTimeWindowEndAtStatusRows: [
      { status: "CLOSED", count: 2 },
      { status: "EXPIRED", count: 1 },
    ],
  });

  assert.deepEqual(response.retention.rows[0], {
    cohortDate: "2026-05-01",
    activeUsers: 2,
    retainedWithin3Days: 1,
    retainedWithin5Days: 1,
    retainedWithin7Days: 2,
    retentionRate3Days: 0.5,
    retentionRate5Days: 0.5,
    retentionRate7Days: 1,
  });

  assert.deepEqual(response.userPRCounts, {
    usersWithAnyPR: 2,
    creatorUsers: 1,
    participantUsers: 2,
    createdPRs: 2,
    joinedPRs: 3,
    averageCreatedPerCreator: 2,
    averageJoinedPerParticipant: 1.5,
    maxCreatedByOneUser: 2,
    maxJoinedByOneUser: 2,
  });

  assert.deepEqual(response.prLifecycle.createdAtCohort, {
    createdPRs: 5,
    formedPRs: 2,
    closedPRs: 1,
    expiredPRs: 1,
    activeOrOpenPRs: 3,
    statusRows: [
      { status: "CLOSED", count: 1, share: 0.2 },
      { status: "EXPIRED", count: 1, share: 0.2 },
      { status: "OPEN", count: 2, share: 0.4 },
      { status: "READY", count: 1, share: 0.2 },
    ],
  });
  assert.equal(response.prLifecycle.formedPRs, 2);
  assert.deepEqual(response.prLifecycle.timeWindowEndAtCohort, {
    createdPRs: 3,
    formedPRs: 2,
    closedPRs: 2,
    expiredPRs: 1,
    activeOrOpenPRs: 0,
    statusRows: [
      { status: "CLOSED", count: 2, share: 2 / 3 },
      { status: "EXPIRED", count: 1, share: 1 / 3 },
    ],
  });

  assert.deepEqual(response.anchorEventTransitions, [
    {
      fromActivityType: "badminton",
      toActivityType: "running",
      userCount: 1,
      transitionCount: 1,
    },
  ]);

  assert.deepEqual(response.viewOtherActivities, {
    clickJourneys: 2,
    clickUsers: 2,
    landingViewJourneys: 1,
    landingViewUsers: 1,
    journeyConversionRate: 0.5,
    userConversionRate: 0.5,
  });
});

test("buildBIOverviewResponse uses retention lookahead only for returns, not new cohorts", () => {
  const response = buildBIOverviewResponse({
    filters,
    retentionEvents: [
      buildEvent({
        journeyId: "journey-a-1",
        eventName: "page.viewed",
        occurredAt: "2026-05-01T04:00:00.000Z",
        authenticatedUserHash: "user-a",
      }),
      buildEvent({
        journeyId: "journey-a-2",
        eventName: "page.viewed",
        occurredAt: "2026-05-09T04:00:00.000Z",
        authenticatedUserHash: "user-a",
      }),
      buildEvent({
        journeyId: "journey-b-1",
        eventName: "page.viewed",
        occurredAt: "2026-05-09T04:00:00.000Z",
        authenticatedUserHash: "user-b",
      }),
    ],
    behaviorEvents: [],
    userPRCountRows: [],
    prLifecycleCreatedAtStatusRows: [],
    prLifecycleTimeWindowEndAtStatusRows: [],
  });

  assert.equal(response.retention.rows.length, 1);
  assert.equal(response.retention.rows[0]?.cohortDate, "2026-05-01");
  assert.equal(response.retention.rows[0]?.retainedWithin7Days, 0);
});

test("buildBIOverviewResponse treats plaza entry clicks as view-other conversion entries", () => {
  const response = buildBIOverviewResponse({
    filters,
    retentionEvents: [],
    behaviorEvents: [
      buildEvent({
        journeyId: "journey-plaza",
        eventName: "home.event.plaza.entry.click",
        occurredAt: "2026-05-01T04:10:00.000Z",
        authenticatedUserHash: "user-a",
      }),
      buildEvent({
        journeyId: "journey-plaza",
        eventName: "anchor_event.landing.viewed",
        occurredAt: "2026-05-01T04:12:00.000Z",
        authenticatedUserHash: "user-a",
      }),
    ],
    userPRCountRows: [],
    prLifecycleCreatedAtStatusRows: [],
    prLifecycleTimeWindowEndAtStatusRows: [],
  });

  assert.equal(response.viewOtherActivities.clickJourneys, 1);
  assert.equal(response.viewOtherActivities.landingViewJourneys, 1);
  assert.equal(response.viewOtherActivities.journeyConversionRate, 1);
});
