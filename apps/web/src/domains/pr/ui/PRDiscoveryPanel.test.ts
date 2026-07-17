import { describe, expect, it } from "vitest";
import { isPRDiscoveryFormViewExit } from "./PRDiscoveryPanel.vue";

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
