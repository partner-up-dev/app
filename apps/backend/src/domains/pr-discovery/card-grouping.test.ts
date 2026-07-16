import assert from "node:assert/strict";
import { test } from "vitest";
import type { PRDiscoveryCandidate } from "./contracts";
import {
  buildPRDiscoveryCardKey,
  groupPRDiscoveryCandidates,
  normalizePreferenceFingerprint,
} from "./services/card-grouping";

const time: [string, string] = ["2038-01-01T00:00:00.000Z", "2038-01-01T01:00:00.000Z"];

const candidate = (
  input: Partial<PRDiscoveryCandidate> & { prId: number },
): PRDiscoveryCandidate => ({
  canonicalPath: `/pr/${input.prId}`,
  title: null,
  type: "study",
  location: "图书馆",
  route: null,
  placeDisplayName: "图书馆",
  preferences: ["安静", "新手友好"],
  notes: null,
  time,
  status: "OPEN",
  minPartners: 2,
  maxPartners: 4,
  partnerCount: 0,
  createdAt: "2038-01-01T00:00:00.000Z",
  ...input,
});

test("CARD groups location PRs and exposes the old demand-card summary", () => {
  assert.equal(normalizePreferenceFingerprint([" 安静 ", "新手友好", "安静"]), "安静|新手友好");
  const value = candidate({ prId: 7 });
  assert.equal(buildPRDiscoveryCardKey(value), `${time[0]}::${time[1]}::图书馆::安静|新手友好`);
  const [group] = groupPRDiscoveryCandidates([value]);
  assert.deepEqual(
    group && {
      cardKey: group.cardKey,
      timeWindow: group.timeWindow,
      displayLocationName: group.displayLocationName,
      preferenceFingerprint: group.preferenceFingerprint,
      preferenceTags: group.preferenceTags,
      notes: group.notes,
      detailPrId: group.detailPrId,
      candidateCount: group.candidateCount,
    },
    {
      cardKey: `${time[0]}::${time[1]}::图书馆::安静|新手友好`,
      timeWindow: time,
      displayLocationName: "图书馆",
      preferenceFingerprint: "安静|新手友好",
      preferenceTags: ["安静", "新手友好"],
      notes: null,
      detailPrId: 7,
      candidateCount: 1,
    },
  );
});

test("CARD representative prefers the earliest-created candidate with notes", () => {
  const noNotes = candidate({
    prId: 1,
    preferences: [],
    createdAt: "2037-01-01T00:00:00.000Z",
  });
  const notes = candidate({
    prId: 2,
    preferences: [],
    notes: "  带球拍  ",
    createdAt: "2037-01-02T00:00:00.000Z",
  });
  const laterNotes = candidate({
    prId: 3,
    preferences: [],
    notes: "later",
    createdAt: "2037-01-03T00:00:00.000Z",
  });
  const [group] = groupPRDiscoveryCandidates([laterNotes, notes, noNotes]);
  assert.equal(group?.detailPrId, 2);
  assert.equal(group?.notes, "带球拍");
  assert.deepEqual(
    group?.candidates.map(({ prId }) => prId),
    [1, 2, 3],
  );
});

test("route-only persisted PRs do not become CARD demand cards", () => {
  const routeCandidate = candidate({
    prId: 8,
    type: "ride",
    location: null,
    route: [
      { name: "A", full_address: null, wgs84: null, bd09: null, gcj02: [1, 1] },
      { name: "B", full_address: null, wgs84: null, bd09: null, gcj02: [2, 2] },
    ],
    placeDisplayName: "A~B",
    preferences: [],
  });
  assert.equal(buildPRDiscoveryCardKey(routeCandidate), null);
  assert.deepEqual(groupPRDiscoveryCandidates([routeCandidate]), []);
});
