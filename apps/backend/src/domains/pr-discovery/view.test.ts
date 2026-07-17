import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findByType: vi.fn<() => unknown>(),
  listAll: vi.fn<() => unknown>(),
  findByTypePR: vi.fn<() => unknown>(),
  countActiveByPrIds: vi.fn<() => unknown>(),
  findPois: vi.fn<() => unknown>(),
  listPois: vi.fn<() => unknown>(),
}));
vi.mock("../pr-core/services/pr-read.service", () => ({
  readVisiblePartnerRequestsByType: mocks.findByTypePR,
}));
vi.mock("../../repositories/PRTypeConfigRepository", () => ({
  PRTypeConfigRepository: class {
    findByType = mocks.findByType;
    listAll = mocks.listAll;
  },
}));
vi.mock("../../repositories/PartnerRequestRepository", () => ({
  PartnerRequestRepository: class {
    findByType = mocks.findByTypePR;
  },
}));
vi.mock("../../repositories/PartnerRepository", () => ({
  PartnerRepository: class {
    countActiveByPrIds = mocks.countActiveByPrIds;
    findActiveByUserId = vi.fn<() => unknown>();
  },
}));
vi.mock("../../repositories/PoiRepository", () => ({
  PoiRepository: class {
    findByNames = mocks.findPois;
    listAll = mocks.listPois;
  },
}));

const {
  getPRDiscoveryTypeDetail,
  getPRDiscoveryView,
  listPRDiscoveryCatalog,
  resolvePRDiscoveryViewMode,
} = await import("./use-cases/catalog");

const config = {
  type: "study",
  title: "Study",
  description: "desc",
  coverImage: null,
  communityQrCode: null,
  locationPool: ["Library South Campus"],
  routePool: [],
  discoveryFormRatio: 50,
  discoveryCardRatio: 50,
  discoveryListRatio: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findByType.mockResolvedValue(config);
  mocks.countActiveByPrIds.mockResolvedValue(new Map());
  mocks.findPois.mockResolvedValue([
    {
      id: 1,
      name: "Library South Campus",
      status: "PUBLISHED",
      gallery: [" image.jpg ", ""],
    },
  ]);
  mocks.listPois.mockResolvedValue([]);
});

test("missing config and all-zero ratios fall back to LIST", async () => {
  mocks.findByType.mockResolvedValueOnce(null);
  assert.equal((await getPRDiscoveryView("study")).viewMode, "LIST");
  assert.equal(resolvePRDiscoveryViewMode({ FORM: 0, CARD: 0, LIST: 0 }, 0), "LIST");
  mocks.findByType.mockResolvedValue({
    ...config,
    discoveryFormRatio: 0,
    discoveryCardRatio: 0,
    discoveryListRatio: 0,
  });
  assert.equal(resolvePRDiscoveryViewMode({ FORM: 0, CARD: 0, LIST: 0 }, 0.99), "LIST");
});

test("50/50 assignment uses FORM at lower boundary and CARD at upper boundary", async () => {
  assert.equal(resolvePRDiscoveryViewMode({ FORM: 50, CARD: 50, LIST: 0 }, 0), "FORM");
  assert.equal(resolvePRDiscoveryViewMode({ FORM: 50, CARD: 50, LIST: 0 }, 0.5), "CARD");
  assert.equal(resolvePRDiscoveryViewMode({ FORM: 50, CARD: 50, LIST: 0 }, 1), "CARD");
});

test("type detail exposes exactly the discovery presentation contract", async () => {
  const detail = await getPRDiscoveryTypeDetail(" study ");
  assert.deepEqual(detail, {
    type: "study",
    title: "Study",
    description: "desc",
    coverImage: null,
    locationCount: 1,
    locationPool: ["Library South Campus"],
    routeCount: 0,
    routePool: [],
    pois: [{ id: 1, name: "Library South Campus", gallery: [" image.jpg ", ""] }],
    fallbackGallery: ["image.jpg"],
    communityQrCode: null,
    viewRatios: { FORM: 50, CARD: 50, LIST: 0 },
  });
});

test("catalog restores normalized published POI fallback presentation", async () => {
  mocks.listAll.mockResolvedValue([config]);
  mocks.findPois.mockResolvedValue([]);
  mocks.listPois.mockResolvedValue([
    {
      id: 2,
      name: "Library (South Campus)",
      status: "PUBLISHED",
      gallery: ["fallback.jpg"],
    },
  ]);
  const [item] = await listPRDiscoveryCatalog();
  assert.deepEqual(item?.locationPool, ["Library South Campus"]);
  assert.deepEqual(item?.pois, [
    { id: 2, name: "Library (South Campus)", gallery: ["fallback.jpg"] },
  ]);
  assert.deepEqual(item?.fallbackGallery, ["fallback.jpg"]);
});

test("catalog excludes an exact unpublished POI but preserves a location without a POI", async () => {
  mocks.listAll.mockResolvedValue([
    { ...config, locationPool: ["Pending Library", "Unregistered Library"] },
  ]);
  mocks.findPois.mockResolvedValue([
    {
      id: 3,
      name: "Pending Library",
      status: "PENDING",
      gallery: ["pending.jpg"],
    },
  ]);
  mocks.listPois.mockResolvedValue([]);

  const [item] = await listPRDiscoveryCatalog();
  assert.deepEqual(item?.locationPool, ["Unregistered Library"]);
  assert.equal(item?.locationCount, 1);
  assert.deepEqual(item?.pois, []);
  assert.deepEqual(item?.fallbackGallery, []);
});

test("type detail preserves route pool direction and geometry", async () => {
  const route = [
    { name: "A", full_address: "A road", wgs84: null, bd09: null, gcj02: [1, 1] },
    { name: "B", full_address: "B road", wgs84: null, bd09: null, gcj02: [2, 2] },
  ];
  mocks.findByType.mockResolvedValue({
    ...config,
    locationPool: [],
    routePool: [{ id: "southbound", route }],
  });
  mocks.findPois.mockResolvedValue([]);

  const detail = await getPRDiscoveryTypeDetail("study");
  assert.equal(detail.locationCount, 0);
  assert.equal(detail.routeCount, 1);
  assert.deepEqual(detail.routePool, [{ id: "southbound", route }]);
});

test("view response names the presentation mode viewMode", async () => {
  const result = await getPRDiscoveryView("study");
  assert.equal(["FORM", "CARD"].includes(result.viewMode), true);
  assert.equal("view" in result, false);
});
