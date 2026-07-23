import assert from "node:assert/strict";
import { test } from "vitest";
import {
  buildPRDiscoveryFunnelResponseFromRows,
  resolvePRDiscoveryFunnelFilters,
  type PRDiscoveryFunnelFactRow,
  type PRDiscoveryFunnelFilters,
} from "./pr-discovery-funnel.model";

const filters: PRDiscoveryFunnelFilters = resolvePRDiscoveryFunnelFilters({
  startAt: new Date("2026-05-01T00:00:00.000Z"),
  endAt: new Date("2026-05-02T00:00:00.000Z"),
});

const row = (input: {
  eventName: string;
  journeyId: string;
  occurredAt?: string;
  prType?: string | null;
  viewMode?: string | null;
  origin?: string | null;
}): PRDiscoveryFunnelFactRow => ({
  eventId: `${input.journeyId}:${input.eventName}:${input.occurredAt ?? "inside"}`,
  eventName: input.eventName,
  eventVersion: 1,
  journeyId: input.journeyId,
  traceId: null,
  occurredAt: new Date(input.occurredAt ?? "2026-05-01T12:00:00.000Z"),
  stepKey: input.eventName.split(".").at(-1) ?? "unknown",
  prType: input.prType === undefined ? "hiking" : input.prType,
  viewMode: input.viewMode === undefined ? "LIST" : input.viewMode,
  origin: input.origin === undefined ? "direct" : input.origin,
  prId: null,
  rank: null,
  action: null,
  outcome: null,
  handoffReason: null,
  routePath: "/prd",
  routeName: "pr-discovery",
  spm: null,
  sourceQr: null,
  routeContextStatus: "context_complete",
  anonymousId: "anon",
  authenticatedUserHash: null,
  authContextStatus: "context_unknown",
});

const names = [
  "pr.discovery.surface.viewed",
  "pr.discovery.criteria.submitted",
  "pr.discovery.recommendation.returned",
  "pr.discovery.candidate.impression",
  "pr.discovery.candidate.action",
  "pr.discovery.authoring.handoff",
] as const;

test("PR Discovery freezes six-step order, distinct journeys, duplicate events and >100% conversion", () => {
  const rows = names.map((eventName, index) => row({ eventName, journeyId: `journey-${index}` }));
  rows.push(row({ eventName: names[5], journeyId: "journey-later-only" }));
  rows.push(row({ eventName: names[0], journeyId: "journey-0" }));

  const response = buildPRDiscoveryFunnelResponseFromRows(filters, rows);
  assert.deepEqual(
    response.steps.map((step) => step.stepKey),
    [
      "surface_viewed",
      "criteria_submitted",
      "recommendation_returned",
      "candidate_impression",
      "candidate_action",
      "authoring_handoff",
    ],
  );
  assert.equal(response.steps[0].journeyCount, 1);
  assert.equal(response.steps[0].eventCount, 2);
  assert.equal(response.steps[5].journeyCount, 2);
  assert.equal(response.steps[5].conversionFromStart, 2);
});

test("PR Discovery preserves missing dimensions, filters and half-open boundaries", () => {
  const rows = [
    row({ eventName: names[0], journeyId: "at-start", occurredAt: filters.startAt }),
    row({ eventName: names[1], journeyId: "at-end", occurredAt: filters.endAt }),
    row({ eventName: names[2], journeyId: "missing", prType: null }),
    row({ eventName: names[3], journeyId: "card", viewMode: "CARD", origin: "qr" }),
  ];
  const response = buildPRDiscoveryFunnelResponseFromRows(filters, rows);
  assert.equal(response.summary.surfaceJourneys, 1);
  assert.equal(response.summary.criteriaJourneys, 0);
  assert.equal(response.dimensions.length, 2);
  assert.deepEqual(
    response.dimensions.map((entry) => entry.origin),
    ["qr", "direct"],
  );
  const filtered = buildPRDiscoveryFunnelResponseFromRows(
    { ...filters, prType: "hiking", viewMode: "CARD", origin: "qr" },
    rows,
  );
  assert.equal(filtered.steps[3].journeyCount, 1);
  assert.deepEqual(filtered.dimensions, [
    {
      prType: "hiking",
      viewMode: "CARD",
      origin: "qr",
      journeyCount: 1,
      eventCount: 1,
    },
  ]);
});

test("PR Discovery event dictionary remains governed and six-event only", () => {
  const response = buildPRDiscoveryFunnelResponseFromRows(filters, []);
  assert.deepEqual(
    response.eventDictionary.map((entry) => entry.eventName),
    [...names].sort(),
  );
});
