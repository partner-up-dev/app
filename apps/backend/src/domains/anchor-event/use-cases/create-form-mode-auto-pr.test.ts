import { beforeEach, describe, expect, test, vi } from "vitest";
import type { AnchorEvent, PRRoute } from "../../../entities";

const mocks = vi.hoisted(() => ({
  findEventById: vi.fn(),
  canUserCreate: vi.fn(),
  createPRFromStructured: vi.fn(),
  eventOwnsTimeWindow: vi.fn(),
  isPublicEventScopedLocation: vi.fn(),
}));

vi.mock("../../../repositories/AnchorEventRepository", () => ({
  AnchorEventRepository: class {
    findById = mocks.findEventById;
  },
}));

vi.mock("../../pr/services", () => ({
  canUserCreatePRForAnchorEvent: mocks.canUserCreate,
}));

vi.mock("../../pr/model/pr", () => ({
  createPRFromStructured: mocks.createPRFromStructured,
}));

vi.mock("../services/time-window-pool", () => ({
  eventOwnsTimeWindow: mocks.eventOwnsTimeWindow,
}));

vi.mock("../services/event-scope", () => ({
  isPublicEventScopedLocation: mocks.isPublicEventScopedLocation,
}));

const { createAnchorEventFormModeAutoPR } = await import(
  "./create-form-mode-auto-pr"
);

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
  mocks.canUserCreate.mockReturnValue(true);
  mocks.createPRFromStructured.mockResolvedValue({
    id: 99,
    createdBy: null,
    status: "OPEN",
    canonicalPath: "/pr/99",
  });
  mocks.eventOwnsTimeWindow.mockReturnValue(true);
  mocks.isPublicEventScopedLocation.mockResolvedValue(true);
});

describe("createAnchorEventFormModeAutoPR", () => {
  test("creates an open system-owned PR and preserves multiple preferences", async () => {
    const allowEditAfterReady = {
      timeWindow: [
        "2038-01-02T00:00:00.000Z",
        "2038-01-02T23:59:00.000Z",
      ] satisfies [string, string],
    };

    const result = await createAnchorEventFormModeAutoPR({
      eventId: 7,
      timeWindow,
      place: {
        kind: "location",
        locationId: "大学城体育中心",
      },
      preferences: [" 安静 ", "新手友好", "安静"],
      allowEditAfterReady,
    });

    expect(result).toEqual({
      id: 99,
      createdBy: null,
      status: "OPEN",
      canonicalPath: "/pr/99",
    });
    expect(mocks.createPRFromStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "数学自习",
        time: timeWindow,
        location: "大学城体育中心",
        route: null,
        preferences: ["安静", "新手友好"],
      }),
      {
        authenticatedUserId: null,
        anonymousUserId: null,
        oauthOpenId: null,
      },
      expect.objectContaining({
        anchorEventId: 7,
        createSource: "EVENT_FORM_MODE_AUTO",
        publicationMode: "create-open",
        allowEditAfterReady,
      }),
    );
  });

  test("uses the submitted concrete route for route place", async () => {
    await createAnchorEventFormModeAutoPR({
      eventId: 7,
      timeWindow,
      place: {
        kind: "route",
        route,
      },
      preferences: [],
    });

    expect(mocks.createPRFromStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        location: null,
        route,
      }),
      expect.any(Object),
      expect.objectContaining({
        createSource: "EVENT_FORM_MODE_AUTO",
        publicationMode: "create-open",
      }),
    );
  });
});
