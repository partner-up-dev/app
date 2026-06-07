import { beforeEach, describe, expect, test, vi } from "vitest";
import type { AnchorEvent, PRRoute } from "../../../entities";

const mocks = vi.hoisted(() => ({
  findEventById: vi.fn(),
  findTags: vi.fn(),
  readVisibleRecords: vi.fn(),
  countActiveLocationPRs: vi.fn(),
  canUserCreate: vi.fn(),
  resolvePoi: vi.fn(),
  createPRFromStructured: vi.fn(),
  eventOwnsTimeWindow: vi.fn(),
  isPublicEventScopedLocation: vi.fn(),
  findEventRoutePoolEntry: vi.fn(),
  arePRRoutesEqual: vi.fn(),
}));

vi.mock("../../../repositories/AnchorEventRepository", () => ({
  AnchorEventRepository: class {
    findById = mocks.findEventById;
  },
}));

vi.mock("../../../repositories/AnchorEventPreferenceTagRepository", () => ({
  AnchorEventPreferenceTagRepository: class {
    findByAnchorEventIdAndStatuses = mocks.findTags;
  },
}));

vi.mock("../../pr/services", () => ({
  countActiveVisiblePRsByEventTimeWindowAndLocation:
    mocks.countActiveLocationPRs,
  readVisibleAnchorEventPRContextRecordsByEventTimeWindow:
    mocks.readVisibleRecords,
  canUserCreatePRForAnchorEvent: mocks.canUserCreate,
}));

vi.mock("../../poi", () => ({
  resolvePublishedPoiByLocation: mocks.resolvePoi,
}));

vi.mock("../../pr/model/pr", () => ({
  createPRFromStructured: mocks.createPRFromStructured,
}));

vi.mock("../services/time-window-pool", () => ({
  eventOwnsTimeWindow: mocks.eventOwnsTimeWindow,
}));

vi.mock("../services/event-scope", () => ({
  arePRRoutesEqual: mocks.arePRRoutesEqual,
  findEventRoutePoolEntry: mocks.findEventRoutePoolEntry,
  isPublicEventScopedLocation: mocks.isPublicEventScopedLocation,
}));

const { materializeAnchorEventDummyPR } = await import("./materialize-dummy-pr");

const timeWindow: [string, string] = [
  "2038-01-02T12:35:00.000Z",
  "2038-01-02T13:35:00.000Z",
];

const route: PRRoute = [
  {
    name: "Route Origin",
    full_address: null,
    wgs84: null,
    bd09: null,
    gcj02: [23.0674, 113.2698],
  },
  {
    name: "Route Destination",
    full_address: null,
    wgs84: null,
    bd09: null,
    gcj02: [23.1405, 113.327],
  },
];

const event = {
  id: 7,
  status: "ACTIVE",
  type: "数学自习",
  defaultMinPartners: 2,
  defaultMaxPartners: 4,
  prCreationPolicy: "USER_AND_ADMIN",
} as AnchorEvent;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findEventById.mockResolvedValue(event);
  mocks.findTags.mockResolvedValue([{ label: "数学" }]);
  mocks.readVisibleRecords.mockResolvedValue([]);
  mocks.countActiveLocationPRs.mockResolvedValue(0);
  mocks.canUserCreate.mockReturnValue(true);
  mocks.resolvePoi.mockResolvedValue(null);
  mocks.eventOwnsTimeWindow.mockReturnValue(true);
  mocks.isPublicEventScopedLocation.mockResolvedValue(true);
  mocks.findEventRoutePoolEntry.mockReturnValue({ id: "route-a", route });
  mocks.arePRRoutesEqual.mockReturnValue(false);
  mocks.createPRFromStructured.mockResolvedValue({
    id: 99,
    createdBy: null,
    status: "OPEN",
    canonicalPath: "/pr/99",
  });
});

describe("materializeAnchorEventDummyPR", () => {
  test("creates an open system-owned PR without creator identity", async () => {
    const result = await materializeAnchorEventDummyPR({
      eventId: 7,
      timeWindow,
      place: {
        kind: "location",
        locationId: "大学城体育中心",
      },
      preferences: ["数学"],
    });

    expect(result).toEqual({
      id: 99,
      createdBy: null,
      status: "OPEN",
      canonicalPath: "/pr/99",
      materialization: "created",
    });
    expect(mocks.createPRFromStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "数学自习",
        time: timeWindow,
        location: "大学城体育中心",
        route: null,
        preferences: ["数学"],
      }),
      {
        authenticatedUserId: null,
        anonymousUserId: null,
        oauthOpenId: null,
      },
      expect.objectContaining({
        anchorEventId: 7,
        createSource: "EVENT_DUMMY",
        publicationMode: "create-open",
      }),
    );
  });

  test("returns an existing visible PR for the same time and place", async () => {
    mocks.readVisibleRecords.mockResolvedValue([
      {
        root: {
          id: 42,
          location: "大学城体育中心",
          route: null,
          createdBy: "user-1",
          status: "OPEN",
        },
      },
    ]);

    const result = await materializeAnchorEventDummyPR({
      eventId: 7,
      timeWindow,
      place: {
        kind: "location",
        locationId: "大学城体育中心",
      },
      preferences: ["数学"],
    });

    expect(result).toEqual({
      id: 42,
      createdBy: "user-1",
      status: "OPEN",
      canonicalPath: "/pr/42",
      materialization: "existing",
    });
    expect(mocks.createPRFromStructured).not.toHaveBeenCalled();
  });
});
