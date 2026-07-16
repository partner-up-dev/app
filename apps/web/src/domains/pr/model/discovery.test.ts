import { describe, expect, test } from "vitest";
import {
  isPRDiscoveryCreateReplaySelection,
  readPRDiscoveryViewPreference,
  resolvePRDiscoveryViewMode,
  writePRDiscoveryViewPreference,
} from "./discovery";

describe("PR discovery view model", () => {
  test("prefers an explicit local view without extra metadata", () => {
    expect(
      resolvePRDiscoveryViewMode({
        serverViewMode: "FORM",
        preferredViewMode: "CARD",
      }),
    ).toBe("CARD");
  });

  test("falls back to LIST for an invalid or absent server assignment", () => {
    expect(resolvePRDiscoveryViewMode({ serverViewMode: "unknown" })).toBe("LIST");
    expect(resolvePRDiscoveryViewMode({ serverViewMode: null })).toBe("LIST");
  });

  test("stores only the explicit view mode", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    writePRDiscoveryViewPreference(storage, "LIST", "study");
    expect(readPRDiscoveryViewPreference(storage, "study")).toBe("LIST");
    values.set("pr-discovery.view-mode:study", "unexpected");
    expect(readPRDiscoveryViewPreference(storage, "study")).toBeNull();
  });

  test("validates a pending Discovery create replay selection", () => {
    expect(
      isPRDiscoveryCreateReplaySelection({
        type: "study",
        timeWindows: [{ startAt: "start", endAt: "end" }],
        place: { kind: "location", location: "Library" },
        preferences: ["quiet"],
      }),
    ).toBe(true);
    expect(
      isPRDiscoveryCreateReplaySelection({
        type: "study",
        timeWindows: [{ startAt: "start", endAt: "end" }],
        place: { kind: "location", locationId: "legacy" },
        preferences: [],
      }),
    ).toBe(false);
  });
});
