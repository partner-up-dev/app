import { describe, expect, it } from "vitest";
import { isPRDiscoveryFormViewExit, shufflePRDiscoveryCatalog } from "./PRDiscoveryPanel.vue";

describe("PR discovery form view state", () => {
  it("recognizes only transitions that leave FORM", () => {
    expect(isPRDiscoveryFormViewExit("FORM", "LIST")).toBe(true);
    expect(isPRDiscoveryFormViewExit("FORM", "CARD")).toBe(true);
    expect(isPRDiscoveryFormViewExit("LIST", "FORM")).toBe(false);
    expect(isPRDiscoveryFormViewExit("CARD", "FORM")).toBe(false);
    expect(isPRDiscoveryFormViewExit("FORM", "FORM")).toBe(false);
    expect(isPRDiscoveryFormViewExit(undefined, "LIST")).toBe(false);
  });
});

describe("PR discovery catalog order", () => {
  it("shuffles a catalog copy without changing the source order", () => {
    const source = ["one", "two", "three", "four"];

    expect(shufflePRDiscoveryCatalog(source, () => 0)).toEqual(["two", "three", "four", "one"]);
    expect(source).toEqual(["one", "two", "three", "four"]);
  });
});
