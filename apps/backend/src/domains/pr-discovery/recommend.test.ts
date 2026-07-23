import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import type { PRRoute } from "../../entities/partner-request";

const mocks = vi.hoisted(() => ({
  findConfig: vi.fn<() => unknown>(),
  findRequests: vi.fn<() => unknown>(),
  countActiveByPrIds: vi.fn<() => unknown>(),
  findActiveByUserId: vi.fn<() => unknown>(),
}));
vi.mock("../pr/queries", async () => {
  const { getProductLocalDateKey, getProductLocalDateKeyForTimeWindowStart } =
    await import("../pr/services/time-window.service");
  return {
    getProductLocalDateKey,
    getProductLocalDateKeyForTimeWindowStart,
    readVisiblePartnerRequestsByType: mocks.findRequests,
  };
});
vi.mock("../pr/contracts", async () => {
  const { derivePRPreferenceCategory, normalizePRPreferenceLabels } =
    await import("../pr/services/preference-normalization");
  return { derivePRPreferenceCategory, normalizePRPreferenceLabels };
});

vi.mock("../../repositories/PRTypeConfigRepository", () => ({
  PRTypeConfigRepository: class {
    findByType = mocks.findConfig;
  },
}));
vi.mock("../../repositories/PartnerRequestRepository", () => ({
  PartnerRequestRepository: class {
    findByType = mocks.findRequests;
  },
}));
vi.mock("../../repositories/PartnerRepository", () => ({
  PartnerRepository: class {
    countActiveByPrIds = mocks.countActiveByPrIds;
    findActiveByUserId = mocks.findActiveByUserId;
  },
}));

const { recommendPRDiscoveryCandidates } = await import("./use-cases/recommend");

const route: PRRoute = [
  { name: "A", full_address: null, wgs84: null, bd09: null, gcj02: [1, 1] },
  { name: "B", full_address: null, wgs84: null, bd09: null, gcj02: [2, 2] },
];

const makeRecord = (
  id: number,
  candidateRoute: PRRoute,
  time: [string | null, string | null] = ["2038-01-01T10:00:00.000Z", "2038-01-01T11:00:00.000Z"],
) => ({
  id,
  title: null,
  type: "ride",
  location: null,
  route: candidateRoute,
  status: "OPEN",
  visibilityStatus: "VISIBLE",
  time,
  minPartners: 2,
  maxPartners: 4,
  preferences: [],
  notes: null,
  createdAt: new Date("2037-01-01T00:00:00.000Z"),
});

const makeLocationRecord = (input: { id: number; location: string; preferences?: string[] }) => ({
  ...makeRecord(input.id, route),
  type: "study",
  location: input.location,
  route: null,
  preferences: input.preferences ?? [],
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findConfig.mockResolvedValue({
    type: "ride",
    title: "Ride",
    description: null,
    coverImage: null,
    locationPool: [],
    routePool: [{ id: "r1", route }],
    discoveryFormRatio: 50,
    discoveryCardRatio: 50,
    discoveryListRatio: 0,
  });
  mocks.countActiveByPrIds.mockResolvedValue(new Map());
  mocks.findActiveByUserId.mockResolvedValue([]);
});

test("route scope accepts reverse selection but candidates match selected route exactly", async () => {
  const reversed = [...route].reverse();
  mocks.findRequests.mockResolvedValue([makeRecord(1, reversed), makeRecord(2, route)]);
  const result = await recommendPRDiscoveryCandidates({
    type: "ride",
    place: { kind: "route", route: reversed },
    timeWindows: [{ startAt: "2038-01-01T10:00:00.000Z", endAt: "2038-01-01T10:00:00.000Z" }],
    preferences: [],
  });
  assert.equal(result.matchedCandidate?.prId, 1);
  assert.equal(result.orderedCandidates.length, 0);
});

test("recommendation start score treats a missing time as -3", async () => {
  mocks.findRequests.mockResolvedValue([makeRecord(3, route, [null, null])]);
  const result = await recommendPRDiscoveryCandidates({
    type: "ride",
    place: { kind: "route", route },
    timeWindows: [{ startAt: "2038-01-01T12:00:00.000Z", endAt: "2038-01-01T12:00:00.000Z" }],
    preferences: [],
  });
  assert.equal(result.orderedCandidates[0]?.match.startDeltaMinutes, null);
  assert.equal(result.orderedCandidates[0]?.match.startWithinWindow, false);
  assert.equal(result.orderedCandidates[0]?.match.score, 0);
});

test("location no-match keeps other configured locations as approximate candidates", async () => {
  mocks.findConfig.mockResolvedValue({
    type: "study",
    title: "Study",
    description: null,
    coverImage: null,
    communityQrCode: null,
    locationPool: ["Library A", "Library B"],
    routePool: [],
    discoveryFormRatio: 50,
    discoveryCardRatio: 50,
    discoveryListRatio: 0,
  });
  mocks.findRequests.mockResolvedValue([makeLocationRecord({ id: 4, location: "Library B" })]);
  const result = await recommendPRDiscoveryCandidates({
    type: "study",
    place: { kind: "location", location: "Library A" },
    timeWindows: [{ startAt: "2038-01-01T10:00:00.000Z", endAt: "2038-01-01T11:00:00.000Z" }],
    preferences: [],
  });
  assert.equal(result.matchedCandidate, null);
  assert.deepEqual(
    result.orderedCandidates.map(({ prId }) => prId),
    [4],
  );
  assert.equal(result.orderedCandidates[0]?.match.exactPlace, false);
});

test("recommendation collapses whitespace before exact and category conflict matching", async () => {
  mocks.findConfig.mockResolvedValue({
    type: "study",
    title: "Study",
    description: null,
    coverImage: null,
    communityQrCode: null,
    locationPool: ["Library"],
    routePool: [],
    discoveryFormRatio: 50,
    discoveryCardRatio: 50,
    discoveryListRatio: 0,
  });
  mocks.findRequests.mockResolvedValue([
    makeLocationRecord({ id: 5, location: "Library", preferences: [" 节奏:高手 "] }),
  ]);
  const result = await recommendPRDiscoveryCandidates({
    type: "study",
    place: { kind: "location", location: "Library" },
    timeWindows: [{ startAt: "2038-01-01T10:00:00.000Z", endAt: "2038-01-01T11:00:00.000Z" }],
    preferences: ["  节奏: 新手   友好  "],
  });
  assert.deepEqual(result.selection.preferences, ["节奏: 新手 友好"]);
  assert.deepEqual(result.orderedCandidates[0]?.match.conflictingTagMatches, ["节奏:高手"]);
});
