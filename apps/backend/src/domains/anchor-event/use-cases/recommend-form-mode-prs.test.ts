import assert from "node:assert/strict";
import { test } from "vitest";
import {
  buildAnchorEventRecommendationMatch,
  isAnchorEventMatchedRecommendation,
} from "../services/form-mode";

test("Form Mode recommendation time windows match candidate PR startAt inside the submitted interval", () => {
  const match = buildAnchorEventRecommendationMatch({
    requestedLocationId: "court-a",
    requestedTimeWindows: [
      {
        startAt: "2030-05-19T09:00:00.000Z",
        endAt: "2030-05-19T11:00:00.000Z",
      },
    ],
    requestedPreferences: [],
    candidateLocationId: "court-a",
    candidateTimeWindow: [
      "2030-05-19T10:00:00.000Z",
      "2030-05-19T12:00:00.000Z",
    ],
    candidatePreferences: [],
    candidateMinPartners: 2,
    activePartnerCount: 1,
  });

  assert.equal(match.startWithinTolerance, true);
  assert.equal(isAnchorEventMatchedRecommendation(match), true);
});

test("Form Mode recommendation time windows ignore candidate PR duration overlap when startAt is outside", () => {
  const match = buildAnchorEventRecommendationMatch({
    requestedLocationId: "court-a",
    requestedTimeWindows: [
      {
        startAt: "2030-05-19T09:00:00.000Z",
        endAt: "2030-05-19T11:00:00.000Z",
      },
    ],
    requestedPreferences: [],
    candidateLocationId: "court-a",
    candidateTimeWindow: [
      "2030-05-19T08:30:00.000Z",
      "2030-05-19T09:30:00.000Z",
    ],
    candidatePreferences: [],
    candidateMinPartners: 2,
    activePartnerCount: 1,
  });

  assert.equal(match.startWithinTolerance, false);
  assert.equal(isAnchorEventMatchedRecommendation(match), false);
});
