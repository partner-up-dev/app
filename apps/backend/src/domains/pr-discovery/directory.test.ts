import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import { getProductLocalDateKey } from "../pr/services/time-window.service";

const mocks = vi.hoisted(() => ({
  findByType: vi.fn<() => unknown>(),
  countActiveByPrIds: vi.fn<() => unknown>(),
  findActiveByUserId: vi.fn<() => unknown>(),
}));
vi.mock("../../repositories/PRTypeConfigRepository", () => ({ PRTypeConfigRepository: class {} }));
vi.mock("../../repositories/PartnerRequestRepository", () => ({
  PartnerRequestRepository: class {
    findByType = mocks.findByType;
    findVisibleByType = mocks.findByType;
    findById = vi.fn<() => unknown>().mockResolvedValue(null);
    updateStatus = vi.fn<() => unknown>().mockResolvedValue(null);
  },
}));
vi.mock("../../repositories/PartnerRepository", () => ({
  PartnerRepository: class {
    countActiveByPrIds = mocks.countActiveByPrIds;
    findActiveByUserId = mocks.findActiveByUserId;
  },
}));
vi.mock("../pr/queries", async () => {
  const { getProductLocalDateKey, getProductLocalDateKeyForTimeWindowStart } = await import(
    "../pr/services/time-window.service"
  );
  return {
    getProductLocalDateKey,
    getProductLocalDateKeyForTimeWindowStart,
    readVisiblePartnerRequestsByType: mocks.findByType,
  };
});

const { listPRDiscoveryDirectory } = await import("./use-cases/directory");

const nextDate = (): string => {
  const today = getProductLocalDateKey(new Date()) ?? "2026-07-16";
  const value = new Date(`${today}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
};

const record = (input: Partial<Record<string, unknown>>) => ({
  id: 1,
  title: "Study",
  type: "study",
  location: "Library",
  route: null,
  status: "OPEN",
  visibilityStatus: "VISIBLE",
  time: ["2038-01-01T00:00:00.000Z", "2038-01-01T01:00:00.000Z"],
  minPartners: 2,
  maxPartners: 4,
  preferences: [],
  notes: null,
  createdAt: new Date("2037-01-01T00:00:00.000Z"),
  ...input,
});

beforeEach(() => {
  vi.clearAllMocks();
  const date = nextDate();
  mocks.findByType.mockResolvedValue([
    record({ id: 1, time: [`${date}T00:00:00.000Z`, `${date}T01:00:00.000Z`] }),
    record({ id: 2, time: [`${date}T00:00:00.000Z`, `${date}T01:00:00.000Z`] }),
    record({ id: 3, status: "DRAFT" }),
    record({ id: 4, visibilityStatus: "HIDDEN" }),
  ]);
  mocks.countActiveByPrIds.mockResolvedValue(
    new Map([
      [1, 1],
      [2, 2],
    ]),
  );
  mocks.findActiveByUserId.mockResolvedValue([]);
});

test("directory excludes viewer active PRs from both candidates and cardGroups", async () => {
  const date = nextDate();
  mocks.findActiveByUserId.mockResolvedValue([{ prId: 2 }]);
  const result = await listPRDiscoveryDirectory({
    type: "study",
    dates: [date],
    viewerUserId: "viewer-1",
  });
  assert.deepEqual(
    result.candidates.map(({ prId }) => prId),
    [1],
  );
  assert.deepEqual(
    result.cardGroups.flatMap((group) => group.candidates.map(({ prId }) => prId)),
    [1],
  );
  assert.equal(mocks.findByType.mock.calls.length, 1);
});

test("directory preserves exact trimmed type/date criteria and canonical candidate paths", async () => {
  const date = nextDate();
  const result = await listPRDiscoveryDirectory({ type: " study ", dates: [date] });
  assert.deepEqual(result.criteria, { type: "study", dates: [date] });
  assert.deepEqual(
    result.candidates.map((candidate) => candidate.prId),
    [1, 2],
  );
  assert.equal(result.candidates[0]!.canonicalPath, "/pr/1");
  assert.deepEqual(
    result.cardGroups.flatMap((group) => group.candidates.map(({ prId }) => prId)),
    [1, 2],
  );
});

test("directory keeps historical LIST records independent from active candidates", async () => {
  mocks.findByType.mockResolvedValue([
    record({ id: 1, status: "OPEN" }),
    record({ id: 2, status: "READY" }),
    record({ id: 3, status: "ACTIVE" }),
    record({ id: 4, status: "CLOSED" }),
    record({ id: 5, status: "EXPIRED" }),
  ]);

  const result = await listPRDiscoveryDirectory({ type: "study" });

  assert.deepEqual(
    result.candidates.map(({ prId }) => prId),
    [1],
  );
  assert.deepEqual(
    result.listRecords.map(({ prId, status }) => [prId, status]),
    [
      [1, "OPEN"],
      [2, "READY"],
      [3, "ACTIVE"],
      [4, "CLOSED"],
    ],
  );
});

test("LIST records are not removed when viewer is already active in the PR", async () => {
  mocks.findByType.mockResolvedValue([record({ id: 1, status: "CLOSED" })]);
  mocks.findActiveByUserId.mockResolvedValue([{ prId: 1 }]);

  const result = await listPRDiscoveryDirectory({ type: "study", viewerUserId: "viewer-1" });

  assert.deepEqual(result.candidates, []);
  assert.deepEqual(
    result.listRecords.map(({ prId, status }) => [prId, status]),
    [[1, "CLOSED"]],
  );
});
