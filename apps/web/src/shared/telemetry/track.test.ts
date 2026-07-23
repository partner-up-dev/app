import { describe, expect, it } from "vitest";
import { collectTelemetryEvent } from "./collector";

describe("collectTelemetryEvent", () => {
  it("keeps canonical dotted names unchanged", () => {
    const collected = collectTelemetryEvent("pr.primary_cta.impression", {
      prId: 1,
      ctaType: "JOIN",
      viewerState: "VISITOR_JOINABLE",
    });
    expect(collected.envelopes.at(-1)?.event_name).toBe("pr.primary_cta.impression");
  });
});
