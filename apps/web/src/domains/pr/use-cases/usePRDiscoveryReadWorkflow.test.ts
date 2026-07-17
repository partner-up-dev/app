import { describe, expect, it } from "vitest";
import {
  parsePRDiscoveryDateQuery,
  parsePRDiscoveryTypeQuery,
  parsePRDiscoveryViewQuery,
  requiresPRDiscoveryServerView,
  resolvePRDiscoveryReadViewMode,
  shufflePRDiscoveryCatalog,
} from "./usePRDiscoveryReadWorkflow";

describe("PR discovery route query parsing", () => {
  it("normalizes only the canonical type and view values", () => {
    expect(parsePRDiscoveryTypeQuery("  study  ")).toBe("study");
    expect(parsePRDiscoveryTypeQuery("   ")).toBeNull();
    expect(parsePRDiscoveryTypeQuery(["study"])).toBeNull();

    expect(parsePRDiscoveryViewQuery("form")).toBe("FORM");
    expect(parsePRDiscoveryViewQuery("CARD")).toBe("CARD");
    expect(parsePRDiscoveryViewQuery("grid")).toBeNull();
  });

  it("preserves repeated date values with the existing pass-through semantics", () => {
    expect(parsePRDiscoveryDateQuery(" 2026-07-17 ")).toEqual([" 2026-07-17 "]);
    expect(parsePRDiscoveryDateQuery(["2026-07-17", "", null, "2026-07-18"])).toEqual([
      "2026-07-17",
      "",
      "2026-07-18",
    ]);
    expect(parsePRDiscoveryDateQuery(undefined)).toEqual([]);
  });
});

describe("PR discovery view resolution precedence", () => {
  it("prefers explicit route, then local preference, then server, then LIST", () => {
    expect(
      resolvePRDiscoveryReadViewMode({
        explicitViewMode: "FORM",
        preferredViewMode: "CARD",
        serverViewMode: "LIST",
      }),
    ).toBe("FORM");
    expect(
      resolvePRDiscoveryReadViewMode({
        explicitViewMode: null,
        preferredViewMode: "CARD",
        serverViewMode: "FORM",
      }),
    ).toBe("CARD");
    expect(
      resolvePRDiscoveryReadViewMode({
        explicitViewMode: null,
        preferredViewMode: null,
        serverViewMode: "FORM",
      }),
    ).toBe("FORM");
    expect(
      resolvePRDiscoveryReadViewMode({
        explicitViewMode: null,
        preferredViewMode: null,
        serverViewMode: "FORM",
        viewTimedOut: true,
      }),
    ).toBe("LIST");
  });

  it("requests server resolution only when route and local preferences are absent", () => {
    expect(requiresPRDiscoveryServerView(null, null)).toBe(true);
    expect(requiresPRDiscoveryServerView("LIST", null)).toBe(false);
    expect(requiresPRDiscoveryServerView(null, "CARD")).toBe(false);
  });
});

describe("PR discovery catalog order", () => {
  it("shuffles a catalog copy without changing the source order", () => {
    const source = ["one", "two", "three", "four"];

    expect(shufflePRDiscoveryCatalog(source, () => 0)).toEqual(["two", "three", "four", "one"]);
    expect(source).toEqual(["one", "two", "three", "four"]);
  });
});
