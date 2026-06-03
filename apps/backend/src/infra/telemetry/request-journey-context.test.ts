import { describe, expect, test } from "vitest";
import { parseJourneyIdHeader } from "./request-journey-context";

describe("request journey context", () => {
  test("parses valid x-journey-id headers", () => {
    const journeyId = "8e1a5720-cb91-4bb0-ae03-3c490f0a69a0";

    expect(parseJourneyIdHeader(journeyId)).toEqual({
      journeyId,
      rawJourneyId: journeyId,
      valid: true,
    });
  });

  test("marks missing or invalid journey ids as unavailable", () => {
    expect(parseJourneyIdHeader(undefined)).toEqual({
      journeyId: null,
      rawJourneyId: null,
      valid: false,
    });

    expect(parseJourneyIdHeader("not-a-uuid")).toEqual({
      journeyId: null,
      rawJourneyId: "not-a-uuid",
      valid: false,
    });
  });
});
