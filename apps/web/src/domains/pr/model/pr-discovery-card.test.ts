import { describe, expect, it } from "vitest";
import {
  toPRDiscoveryCardViewModels,
  toPRDiscoveryCreationCardViewModels,
} from "@/domains/pr/model/pr-discovery-card";
import {
  buildPRDiscoveryCreationSuggestions,
  type PRDiscoveryCreateTimeWindow,
} from "@/domains/pr/model/pr-discovery-creation-suggestion";
import type {
  PRDiscoveryCardGroup,
  PRDiscoveryPersistedCandidate,
} from "@/domains/pr/model/pr-discovery-types";

const time = ["2099-01-01T04:00:00.000Z", "2099-01-01T05:00:00.000Z"] as [string, string];

const candidate = (
  prId: number,
  input: Partial<PRDiscoveryPersistedCandidate> = {},
): PRDiscoveryPersistedCandidate => ({
  prId,
  canonicalPath: "/pr/" + String(prId),
  title: null,
  type: "RIDE_HAILING",
  location: "火车站",
  route: null,
  placeDisplayName: "火车站",
  preferences: ["安静"],
  notes: null,
  time,
  status: "OPEN",
  minPartners: 2,
  maxPartners: 4,
  partnerCount: 0,
  createdAt: "2098-12-01T00:00:00.000Z",
  ...input,
});

describe("PR discovery CARD projection", () => {
  it("uses the earliest persisted candidate with notes as representative", () => {
    const oldestWithoutNotes = candidate(1, {
      createdAt: "2098-01-01T00:00:00.000Z",
    });
    const earliestWithNotes = candidate(2, {
      notes: "从北广场集合",
      createdAt: "2098-02-01T00:00:00.000Z",
    });
    const newerWithNotes = candidate(3, {
      notes: "从南广场集合",
      createdAt: "2098-03-01T00:00:00.000Z",
    });
    const group: PRDiscoveryCardGroup = {
      cardKey: "group:station",
      timeWindow: time,
      batchStartTimestamp: new Date(time[0]).getTime(),
      displayLocationName: "火车站",
      preferenceFingerprint: "安静",
      preferenceTags: ["安静"],
      notes: earliestWithNotes.notes,
      detailPrId: earliestWithNotes.prId,
      representativeCandidate: earliestWithNotes,
      candidateCount: 3,
      candidates: [newerWithNotes, oldestWithoutNotes, earliestWithNotes],
    };

    const [card] = toPRDiscoveryCardViewModels({
      groups: [group],
      typeCoverImage: "type-cover.jpg",
      resolveCoverImage: () => "poi-cover.jpg",
    });

    expect(card).toMatchObject({
      detailPrId: 2,
      notes: "从北广场集合",
      candidateCount: 3,
      coverImage: "poi-cover.jpg",
    });
  });

  it("does not project route-only persisted candidates into CARD", () => {
    const routeOnly = candidate(8, {
      location: null,
      placeDisplayName: "A~B",
      route: [
        {
          name: "A",
          full_address: null,
          wgs84: null,
          bd09: null,
          gcj02: [30, 120],
        },
        {
          name: "B",
          full_address: null,
          wgs84: null,
          bd09: null,
          gcj02: [31, 121],
        },
      ],
    });
    const group: PRDiscoveryCardGroup = {
      cardKey: "route-only",
      timeWindow: time,
      batchStartTimestamp: new Date(time[0]).getTime(),
      displayLocationName: "A~B",
      preferenceFingerprint: null,
      preferenceTags: [],
      notes: null,
      detailPrId: routeOnly.prId,
      representativeCandidate: routeOnly,
      candidateCount: 1,
      candidates: [routeOnly],
    };

    expect(
      toPRDiscoveryCardViewModels({
        groups: [group],
        typeCoverImage: null,
        resolveCoverImage: () => null,
      }),
    ).toEqual([]);
  });
});

describe("PR discovery transient creation suggestions", () => {
  it("remain visible with zero persisted candidates and carry no persisted identity", () => {
    const createWindow: PRDiscoveryCreateTimeWindow = {
      key: "window:station",
      timeWindow: time,
      placeOptions: [
        {
          kind: "location",
          id: "station",
          locationId: "火车站",
          label: "火车站",
          gallery: ["station.jpg"],
          coordinate: { lat: 30, lng: 120 },
          availableStartKeys: ["window:station"],
          remainingQuota: 3,
          disabled: false,
          disabledReason: "NONE",
        },
      ],
    };
    const suggestions = buildPRDiscoveryCreationSuggestions({
      browseTimeWindows: [],
      createTimeWindows: [createWindow],
      presetTags: [{ label: "安静" }],
      now: new Date("2098-01-01T00:00:00.000Z"),
    });

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0]).not.toHaveProperty("prId");
    expect(suggestions[0]).not.toHaveProperty("status");
    expect(suggestions[0]).not.toHaveProperty("canonicalPath");
    expect(
      toPRDiscoveryCreationCardViewModels({
        suggestions,
        typeCoverImage: null,
        resolveCoverImage: () => "station.jpg",
      }),
    ).toHaveLength(suggestions.length);
  });
});
