import assert from "node:assert/strict";
import { test } from "vitest";
import {
  buildAnchorEventRecommendationMatch,
  buildAnchorEventFormModeTimeWindow,
  isAnchorEventFormModeStartSelectable,
  isAnchorEventMatchedRecommendation,
} from "./form-mode";

const requestedStartAt = "2026-04-27T11:30:00.000Z";
const requestedLocationId = "court-a";
const requestedRoute = [
  {
    wgs84: null,
    bd09: null,
    gcj02: [23.0674, 113.2698] as [number, number],
    name: "广州南站",
    full_address: null,
  },
  {
    wgs84: null,
    bd09: null,
    gcj02: [23.1405, 113.327] as [number, number],
    name: "天河体育中心",
    full_address: null,
  },
];

const buildMatch = (
  overrides: Partial<Parameters<typeof buildAnchorEventRecommendationMatch>[0]> = {},
) =>
  buildAnchorEventRecommendationMatch({
    requestedLocationId,
    requestedStartAtIso: requestedStartAt,
    requestedPreferences: ["球风:进攻"],
    candidateLocationId: requestedLocationId,
    candidateTimeWindow: [requestedStartAt, "2026-04-27T12:30:00.000Z"],
    candidatePreferences: ["球风:进攻"],
    candidateMinPartners: 3,
    activePartnerCount: 1,
    ...overrides,
  });

test("isAnchorEventMatchedRecommendation accepts exact location and start within tolerance without preference conflict", () => {
  const match = buildMatch({
    candidateTimeWindow: [
      "2026-04-27T11:35:00.000Z",
      "2026-04-27T12:35:00.000Z",
    ],
  });

  assert.equal(match.exactLocation, true);
  assert.equal(match.exactPlace, true);
  assert.equal(match.startDeltaMinutes, 5);
  assert.equal(match.startWithinTolerance, true);
  assert.equal(isAnchorEventMatchedRecommendation(match), true);
});

test("isAnchorEventMatchedRecommendation rejects different location", () => {
  const match = buildMatch({
    candidateLocationId: "court-b",
  });

  assert.equal(match.exactLocation, false);
  assert.equal(match.exactPlace, false);
  assert.equal(isAnchorEventMatchedRecommendation(match), false);
});

test("isAnchorEventMatchedRecommendation accepts exact route and start within tolerance", () => {
  const match = buildMatch({
    requestedLocationId: null,
    requestedRoute,
    candidateLocationId: null,
    candidateRoute: requestedRoute,
  });

  assert.equal(match.exactLocation, false);
  assert.equal(match.exactRoute, true);
  assert.equal(match.exactPlace, true);
  assert.equal(isAnchorEventMatchedRecommendation(match), true);
});

test("isAnchorEventMatchedRecommendation rejects different route", () => {
  const match = buildMatch({
    requestedLocationId: null,
    requestedRoute,
    candidateLocationId: null,
    candidateRoute: [
      requestedRoute[0]!,
      {
        ...requestedRoute[1]!,
        name: "珠江新城",
      },
    ],
  });

  assert.equal(match.exactRoute, false);
  assert.equal(match.exactPlace, false);
  assert.equal(isAnchorEventMatchedRecommendation(match), false);
});

test("isAnchorEventMatchedRecommendation rejects start outside tolerance", () => {
  const match = buildMatch({
    candidateTimeWindow: [
      "2026-04-27T11:36:00.000Z",
      "2026-04-27T12:36:00.000Z",
    ],
  });

  assert.equal(match.startDeltaMinutes, 6);
  assert.equal(match.startWithinTolerance, false);
  assert.equal(isAnchorEventMatchedRecommendation(match), false);
});

test("isAnchorEventMatchedRecommendation rejects same-category preference conflict", () => {
  const match = buildMatch({
    candidatePreferences: ["球风:防守"],
  });

  assert.deepEqual(match.conflictingTagMatches, ["球风:防守"]);
  assert.equal(isAnchorEventMatchedRecommendation(match), false);
});

test("buildAnchorEventRecommendationMatch gives higher score to stronger group momentum", () => {
  const lowMomentum = buildMatch({
    candidateMinPartners: 4,
    activePartnerCount: 0,
  });
  const highMomentum = buildMatch({
    candidateMinPartners: 3,
    activePartnerCount: 2,
  });

  assert.equal(lowMomentum.groupMomentumScore, 0);
  assert.equal(highMomentum.groupMomentumScore, 2);
  assert.ok(highMomentum.score > lowMomentum.score);
});

test("buildAnchorEventRecommendationMatch treats minPartners of 1 as immediately viable", () => {
  const match = buildMatch({
    candidateMinPartners: 1,
    activePartnerCount: 0,
  });

  assert.equal(match.groupMomentumScore, 2);
});

test("isAnchorEventFormModeStartSelectable respects future start and earliest lead boundary", () => {
  const now = new Date("2026-04-27T08:00:00.000Z");
  const event = {
    timePoolConfig: {
      durationMinutes: 60,
      earliestLeadMinutes: 120,
      startRules: [],
    },
  };

  assert.equal(
    isAnchorEventFormModeStartSelectable(
      event,
      "2026-04-27T09:30:00.000Z",
      now,
    ),
    true,
  );
  assert.equal(
    isAnchorEventFormModeStartSelectable(
      event,
      "2026-04-27T10:01:00.000Z",
      now,
    ),
    false,
  );
  assert.equal(
    isAnchorEventFormModeStartSelectable(
      event,
      "2026-04-27T07:59:00.000Z",
      now,
    ),
    false,
  );
});

test("buildAnchorEventFormModeTimeWindow allows a missing duration", () => {
  const now = new Date("2026-04-27T08:00:00.000Z");
  const event = {
    timePoolConfig: {
      durationMinutes: null,
      earliestLeadMinutes: 120,
      startRules: [],
    },
  } as unknown as Parameters<typeof buildAnchorEventFormModeTimeWindow>[0];

  assert.deepEqual(
    buildAnchorEventFormModeTimeWindow(
      event,
      "2026-04-27T09:30:00.000Z",
      now,
    ),
    ["2026-04-27T09:30:00.000Z", null],
  );
});
