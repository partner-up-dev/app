import { describe, expect, it } from "vitest";
import { resolveCanonicalUserTelemetryEventName } from "./track";

describe("resolveCanonicalUserTelemetryEventName", () => {
  it("keeps registered event families that contain underscores", () => {
    expect(
      resolveCanonicalUserTelemetryEventName("pr_primary_cta_impression"),
    ).toBe("pr.primary_cta.impression");
    expect(resolveCanonicalUserTelemetryEventName("pr_primary_cta_click")).toBe(
      "pr.primary_cta.click",
    );
    expect(
      resolveCanonicalUserTelemetryEventName("pr_secondary_action_click"),
    ).toBe("pr.secondary_action.click");
  });
});
