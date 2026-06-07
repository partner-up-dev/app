import { describe, expect, test } from "vitest";
import type { PRRoute } from "@partner-up-dev/backend";
import type {
  AnchorEventDetailResponse,
  AnchorEventTimeWindow,
} from "@/domains/event/model/types";
import {
  buildAnchorEventDummyPRs,
  normalizePreferenceFingerprint,
} from "./dummy-prs";

type CreateTimeWindow = AnchorEventDetailResponse["createTimeWindows"][number];
type PresetTag = AnchorEventDetailResponse["presetTags"][number];
type BrowsePR = AnchorEventTimeWindow["prs"][number];

const now = new Date("2026-06-05T02:00:00.000Z");
const futureTimeWindow = [
  "2026-06-06T10:00:00.000Z",
  "2026-06-06T11:00:00.000Z",
] satisfies [string, string];
const secondFutureTimeWindow = [
  "2026-06-06T12:00:00.000Z",
  "2026-06-06T13:00:00.000Z",
] satisfies [string, string];
const thirdFutureTimeWindow = [
  "2026-06-06T14:00:00.000Z",
  "2026-06-06T15:00:00.000Z",
] satisfies [string, string];
const nextDayFutureTimeWindow = [
  "2026-06-07T10:00:00.000Z",
  "2026-06-07T11:00:00.000Z",
] satisfies [string, string];
const thirdDayFutureTimeWindow = [
  "2026-06-08T10:00:00.000Z",
  "2026-06-08T11:00:00.000Z",
] satisfies [string, string];
const pastTimeWindow = [
  "2026-06-04T10:00:00.000Z",
  "2026-06-04T11:00:00.000Z",
] satisfies [string, string];

describe("latent Anchor Event PR dummy items", () => {
  test("builds only future enabled single-slot dummies with at most one tag", () => {
    const dummies = buildAnchorEventDummyPRs({
      browseTimeWindows: [],
      createTimeWindows: [
        createWindow("future", futureTimeWindow, [
          locationOption("A"),
          locationOption("B", true),
        ]),
        createWindow("past", pastTimeWindow, [locationOption("A")]),
      ],
      presetTags: [tag("安静"), tag("新手友好")],
      poiByName: new Map(),
      maxDummyCount: 3,
      now,
    });

    expect(dummies).toHaveLength(1);
    expect(dummies[0]?.displayLocationName).toBe("A");
    expect(dummies[0]?.preferenceTags.length).toBeLessThanOrEqual(1);
  });

  test("excludes real PR conflicts by time and place before considering tags", () => {
    const dummies = buildAnchorEventDummyPRs({
      browseTimeWindows: [
        browseWindow("real", futureTimeWindow, [
          realPR({
            id: 1,
            location: "A",
            preferences: ["安静"],
            time: futureTimeWindow,
          }),
        ]),
      ],
      createTimeWindows: [
        createWindow("future", futureTimeWindow, [locationOption("A")]),
        createWindow("future-2", secondFutureTimeWindow, [locationOption("A")]),
      ],
      presetTags: [tag("安静"), tag("新手友好")],
      poiByName: new Map(),
      maxDummyCount: 3,
      now,
    });

    expect(dummies).toHaveLength(1);
    expect(dummies[0]?.timeWindow).toEqual(secondFutureTimeWindow);
  });

  test("counts real PRs inside the per-date opportunity cap before adding dummies", () => {
    const dummies = buildAnchorEventDummyPRs({
      browseTimeWindows: [
        browseWindow("real", futureTimeWindow, [
          realPR({ id: 1, location: "A", time: futureTimeWindow }),
          realPR({ id: 2, location: "B", time: futureTimeWindow }),
        ]),
      ],
      createTimeWindows: [
        createWindow("future", secondFutureTimeWindow, [
          locationOption("A"),
          locationOption("B"),
          locationOption("C"),
        ]),
        createWindow("future-2", thirdFutureTimeWindow, [locationOption("D")]),
      ],
      presetTags: [tag("安静")],
      poiByName: new Map(),
      maxDummyCount: 3,
      perDateOpportunityLimit: 3,
      now,
    });

    expect(dummies).toHaveLength(1);
  });

  test("uses a global cap and selects one to two product-local dates only", () => {
    const dummies = buildAnchorEventDummyPRs({
      browseTimeWindows: [],
      createTimeWindows: [
        createWindow("day-1-a", futureTimeWindow, [locationOption("A")]),
        createWindow("day-1-b", secondFutureTimeWindow, [locationOption("B")]),
        createWindow("day-2-a", nextDayFutureTimeWindow, [locationOption("C")]),
        createWindow("day-3-a", thirdDayFutureTimeWindow, [locationOption("D")]),
      ],
      presetTags: [tag("安静"), tag("新手友好")],
      poiByName: new Map(),
      maxDummyCount: 3,
      maxDateCount: 2,
      now,
    });

    expect(dummies).toHaveLength(3);
    expect(
      new Set(dummies.map((dummy) => dummy.dateKey)).size,
    ).toBeLessThanOrEqual(2);
  });

  test("does not use tags to fill multiple dummies for the same time and place", () => {
    const dummies = buildAnchorEventDummyPRs({
      browseTimeWindows: [],
      createTimeWindows: [
        createWindow("future", futureTimeWindow, [locationOption("A")]),
      ],
      presetTags: [tag("安静"), tag("新手友好")],
      poiByName: new Map(),
      maxDummyCount: 3,
      now,
    });

    expect(dummies).toHaveLength(1);
    expect(
      new Set(
        dummies.map((dummy) => `${dummy.timeWindowStart}:${dummy.placeKey}`),
      ).size,
    ).toBe(1);
  });

  test("prioritizes staggered start times before adding another place at the same time", () => {
    const dummies = buildAnchorEventDummyPRs({
      browseTimeWindows: [],
      createTimeWindows: [
        createWindow("same-time", futureTimeWindow, [
          locationOption("A"),
          locationOption("B"),
        ]),
        createWindow("different-time", secondFutureTimeWindow, [
          locationOption("C"),
        ]),
        createWindow("third-time", thirdFutureTimeWindow, [locationOption("D")]),
      ],
      presetTags: [tag("安静")],
      poiByName: new Map(),
      maxDummyCount: 3,
      maxDummiesPerDate: 3,
      now,
    });

    expect(dummies.map((dummy) => dummy.timeWindowStart)).toEqual([
      futureTimeWindow[0],
      secondFutureTimeWindow[0],
      thirdFutureTimeWindow[0],
    ]);
  });

  test("prefers candidates with different time, place, and preferences from real PRs", () => {
    const dummies = buildAnchorEventDummyPRs({
      browseTimeWindows: [
        browseWindow("real", futureTimeWindow, [
          realPR({
            id: 1,
            location: "A",
            preferences: [],
            time: futureTimeWindow,
          }),
        ]),
      ],
      createTimeWindows: [
        createWindow("same-time", futureTimeWindow, [locationOption("A")]),
        createWindow("different-time", secondFutureTimeWindow, [
          locationOption("B"),
        ]),
      ],
      presetTags: [tag("安静")],
      poiByName: new Map(),
      maxDummyCount: 2,
      now,
    });

    expect(dummies).toHaveLength(1);
    expect(dummies[0]?.timeWindow).toEqual(secondFutureTimeWindow);
    expect(dummies[0]?.displayLocationName).toBe("B");
    expect(dummies[0]?.preferenceTags).toEqual(["安静"]);
  });

  test("normalizes preference fingerprints independent of order and blank labels", () => {
    expect(normalizePreferenceFingerprint([" B ", "", "A", "B"])).toBe("A|B");
  });
});

const tag = (label: string): PresetTag =>
  ({
    id: label.length,
    label,
    description: "",
  }) as PresetTag;

const createWindow = (
  key: string,
  timeWindow: [string, string],
  locations: Array<{
    locationId: string;
    disabled: boolean;
  }>,
): CreateTimeWindow =>
  ({
    key,
    timeWindow,
    description: null,
    locationOptions: locations.map((location) => ({
      locationId: location.locationId,
      remainingQuota: null,
      disabled: location.disabled,
      disabledReason: location.disabled ? "MAX_REACHED" : "NONE",
    })),
    routeOptions: [],
    placeSelector: {
      kind: "location",
      labelKey: "anchorEvent.placeSelector.locationLabel",
      placeholderKey: "anchorEvent.placeSelector.locationPlaceholder",
      ariaLabelKey: "anchorEvent.placeSelector.locationAriaLabel",
      applyActionKey: null,
      options: locations.map((location) => ({
        kind: "location",
        id: `location:${location.locationId}`,
        locationId: location.locationId,
        label: location.locationId,
        gallery: [],
        coordinate: null,
        remainingQuota: null,
        disabled: location.disabled,
        disabledReason: location.disabled ? "MAX_REACHED" : "NONE",
      })),
    },
  }) as unknown as CreateTimeWindow;

const locationOption = (locationId: string, disabled = false) => ({
  locationId,
  disabled,
});

const browseWindow = (
  key: string,
  timeWindow: [string, string],
  prs: BrowsePR[],
): AnchorEventTimeWindow =>
  ({
    key,
    timeWindow,
    description: null,
    prs,
  }) as AnchorEventTimeWindow;

const realPR = ({
  id,
  location,
  route = null,
  preferences = [],
  time,
}: {
  id: number;
  location: string | null;
  route?: PRRoute | null;
  preferences?: string[];
  time: [string, string];
}): BrowsePR =>
  ({
    id,
    title: null,
    type: "羽毛球",
    location,
    route,
    placeDisplayName: location,
    preferences,
    notes: null,
    time,
    status: "OPEN",
    minPartners: 2,
    maxPartners: 4,
    partnerCount: 1,
    createdAt: "2026-06-05T00:00:00.000Z",
  }) as BrowsePR;
