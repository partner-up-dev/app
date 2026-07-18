import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findConfig: vi.fn<() => unknown>(),
  findPois: vi.fn<() => unknown>(),
  findTags: vi.fn<() => unknown>(),
  readVisible: vi.fn<() => unknown>(),
}));

vi.mock("../../repositories/PRTypeConfigRepository", () => ({
  PRTypeConfigRepository: class {
    findByType = mocks.findConfig;
  },
}));
vi.mock("../../repositories/PRTypePreferenceTagRepository", () => ({
  PRTypePreferenceTagRepository: class {
    findByTypeAndStatuses = mocks.findTags;
  },
}));
vi.mock("../../repositories/PoiRepository", () => ({
  PoiRepository: class {
    findByNames = mocks.findPois;
  },
}));
vi.mock("../pr/queries", async () => {
  const { isTimeWindowAvailableByPoiRules } = await import(
    "../pr/services/poi-availability.service"
  );
  return {
    isPRActiveStatus: (status: string) => ["OPEN", "READY", "ACTIVE"].includes(status),
    isPRJoinableStatus: (status: string) => status === "OPEN",
    isTimeWindowAvailableByPoiRules,
    readVisiblePartnerRequestsByType: mocks.readVisible,
  };
});

const { getPRAuthoringOptions } = await import("./use-cases/get-options");

const config = {
  type: "study",
  title: "Study",
  description: "desc",
  coverImage: "https://example.com/cover.jpg",
  authoringTimeWindowEditorDefaultMode: "FUZZY" as const,
  locationPool: ["Library"],
  routePool: [],
  timePoolConfig: {
    durationMinutes: 60,
    earliestLeadMinutes: null,
    startRules: [
      {
        id: "start",
        kind: "ABSOLUTE" as const,
        startAt: "2038-01-01T17:00:00+08:00",
        description: null,
      },
    ],
  },
  defaultMinPartners: 2,
  defaultMaxPartners: 4,
  defaultNotes: "Bring a notebook",
  authoringCreationPolicy: "USER_AND_ADMIN" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findConfig.mockResolvedValue(config);
  mocks.findPois.mockResolvedValue([
    {
      name: "Library",
      gallery: [" image-1 ", "image-2"],
      fullAddress: "Library road",
      gcj02: [23, 113],
      wgs84: null,
      bd09: null,
      perTimeWindowCap: 1,
      availabilityRules: [],
    },
  ]);
  mocks.findTags.mockResolvedValue([
    { label: "安静", description: "quiet", moderationStatus: "PUBLISHED" },
    { label: "待审", description: "pending", moderationStatus: "PENDING" },
  ]);
  mocks.readVisible.mockResolvedValue([]);
});

test("missing config returns ordinary fallback that remains publishable", async () => {
  mocks.findConfig.mockResolvedValue(null);
  const result = await getPRAuthoringOptions("new-type", new Date("2038-01-01T00:00:00.000Z"));
  assert.equal(result.creationAllowed, true);
  assert.equal(result.authoringDefaults.minPartners, 2);
  assert.deepEqual(result.startOptions, []);
  assert.equal(result.defaultSelection, null);
  assert.equal("presentation" in result, false);
  assert.equal("timePolicy" in result, false);
});

test("configured options expose only authoring projection and published preferences", async () => {
  const result = await getPRAuthoringOptions(" study ", new Date("2037-12-01T00:00:00.000Z"));
  assert.equal(result.type, "study");
  assert.deepEqual(result.locationOptions, [
    {
      kind: "location",
      id: "Library",
      locationId: "Library",
      label: "Library",
      fullAddress: "Library road",
      gallery: [" image-1 ", "image-2"],
      coordinate: { lat: 23, lng: 113 },
      availableStartKeys: ["2038-01-01T09:00:00.000Z::2038-01-01T10:00:00.000Z"],
      remainingQuota: null,
      disabled: false,
      disabledReason: "NONE",
    },
  ]);
  assert.equal(result.durationMinutes, 60);
  assert.equal(result.earliestLeadMinutes, null);
  assert.equal(result.timeWindowEditorDefaultMode, "FUZZY");
  assert.equal(result.startOptions[0]?.locationOptions[0]?.remainingQuota, 1);
  assert.deepEqual(result.preferenceTags, [{ label: "安静", description: "quiet" }]);
  assert.equal("gallery" in (result.locationOptions[0] ?? {}), true);
  assert.equal("availableStartKeys" in (result.locationOptions[0] ?? {}), true);
  assert.equal("viewRatios" in result, false);
  assert.equal("joinGateConfig" in result, false);
  assert.equal("status" in result, false);
  assert.equal("updatedAt" in result, false);
});

test("options expose per-start quota and default selection from visible same-type PRs", async () => {
  mocks.readVisible.mockResolvedValue([
    {
      id: 9,
      type: "study",
      location: "Library",
      route: null,
      status: "OPEN",
      visibilityStatus: "VISIBLE",
      time: ["2038-01-01T09:00:00.000Z", "2038-01-01T10:00:00.000Z"],
      createdAt: new Date("2037-01-01T00:00:00.000Z"),
    },
  ]);
  const result = await getPRAuthoringOptions("study", new Date("2037-12-01T00:00:00.000Z"));
  const location = result.startOptions[0]?.locationOptions[0];
  assert.deepEqual(
    location && {
      remainingQuota: location.remainingQuota,
      disabled: location.disabled,
      disabledReason: location.disabledReason,
    },
    { remainingQuota: 0, disabled: true, disabledReason: "MAX_REACHED" },
  );
  assert.deepEqual(result.defaultSelection, {
    sourcePrId: 9,
    locationId: "Library",
    startAt: "2038-01-01T09:00:00.000Z",
  });
});

test("configured locations remain selectable when their POI enrichment is missing", async () => {
  mocks.findPois.mockResolvedValue([]);
  const result = await getPRAuthoringOptions("study", new Date("2037-12-01T00:00:00.000Z"));

  assert.deepEqual(result.locationOptions, [
    {
      kind: "location",
      id: "Library",
      locationId: "Library",
      label: "Library",
      fullAddress: null,
      gallery: [],
      coordinate: null,
      availableStartKeys: ["2038-01-01T09:00:00.000Z::2038-01-01T10:00:00.000Z"],
      remainingQuota: null,
      disabled: false,
      disabledReason: "NONE",
    },
  ]);
  assert.equal(result.startOptions[0]?.locationOptions[0]?.locationId, "Library");
  assert.equal(result.startOptions[0]?.locationOptions[0]?.remainingQuota, null);
});

test("default selection keeps a selectable visible PR outside the generated start options", async () => {
  mocks.readVisible.mockResolvedValue([
    {
      id: 10,
      type: "study",
      location: "Library",
      route: null,
      status: "OPEN",
      visibilityStatus: "VISIBLE",
      time: ["2038-01-01T17:30:00+08:00", "2038-01-01T18:30:00+08:00"],
      createdAt: new Date("2037-01-01T00:00:00.000Z"),
    },
  ]);
  const result = await getPRAuthoringOptions("study", new Date("2037-12-01T00:00:00.000Z"));

  assert.deepEqual(result.defaultSelection, {
    sourcePrId: 10,
    locationId: "Library",
    startAt: "2038-01-01T09:30:00.000Z",
  });
});

test("POI availability rules remove start keys and disable the location for that start", async () => {
  mocks.findPois.mockResolvedValue([
    {
      name: "Library",
      gallery: [],
      fullAddress: null,
      gcj02: null,
      wgs84: null,
      bd09: null,
      perTimeWindowCap: 3,
      availabilityRules: [
        {
          id: "closed",
          kind: "ABSOLUTE",
          mode: "EXCLUDE",
          startAt: "2038-01-01T09:00:00.000Z",
          endAt: "2038-01-01T10:00:00.000Z",
        },
      ],
    },
  ]);
  const result = await getPRAuthoringOptions("study", new Date("2037-12-01T00:00:00.000Z"));

  assert.deepEqual(result.locationOptions[0]?.availableStartKeys, []);
  assert.deepEqual(
    result.startOptions[0]?.locationOptions[0] && {
      remainingQuota: result.startOptions[0].locationOptions[0].remainingQuota,
      disabled: result.startOptions[0].locationOptions[0].disabled,
      disabledReason: result.startOptions[0].locationOptions[0].disabledReason,
    },
    { remainingQuota: 3, disabled: true, disabledReason: "TIME_UNAVAILABLE" },
  );
});

test("route-only authoring exposes every generated start key without location projection", async () => {
  const route = [
    { name: "A", full_address: null, wgs84: null, bd09: null, gcj02: [1, 1] },
    { name: "B", full_address: null, wgs84: null, bd09: null, gcj02: [2, 2] },
  ];
  mocks.findConfig.mockResolvedValue({
    ...config,
    locationPool: [],
    routePool: [{ id: "southbound", route }],
  });
  mocks.findPois.mockResolvedValue([]);
  const result = await getPRAuthoringOptions("study", new Date("2037-12-01T00:00:00.000Z"));

  assert.deepEqual(result.locationOptions, []);
  assert.deepEqual(result.routeOptions, [
    {
      kind: "route",
      id: "southbound",
      routePoolEntryId: "southbound",
      label: "A~B",
      route,
      availableStartKeys: ["2038-01-01T09:00:00.000Z::2038-01-01T10:00:00.000Z"],
      remainingQuota: null,
      disabled: false,
      disabledReason: "NONE",
    },
  ]);
  assert.deepEqual(result.startOptions[0]?.routeOptions, result.routeOptions);
  assert.equal(result.defaultSelection, null);
});
