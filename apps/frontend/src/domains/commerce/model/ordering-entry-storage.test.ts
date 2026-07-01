import { describe, expect, it } from "vitest";
import type { OrderingEntryPayload } from "./ordering-entry-storage";
import { normalizeOrderingEntryPayload } from "./ordering-entry-storage";

const offerDetail = {
  offerId: 2,
  productType: "RIDE_HAILING",
  spus: [],
} as unknown as OrderingEntryPayload["offerDetail"];

describe("ordering entry storage", () => {
  it("preserves placement context for ordering-entry refresh", () => {
    const payload = normalizeOrderingEntryPayload({
      source: { offerId: 2 },
      offerDetail,
      bindings: {},
      bindingLocks: {},
      placementContext: {
        placementInstanceId: 12,
        matchingContext: { prId: 29 },
      },
    });

    expect(payload?.placementContext).toEqual({
      placementInstanceId: 12,
      matchingContext: { prId: 29 },
    });
  });

  it("drops invalid placement context without rejecting the entry", () => {
    const payload = normalizeOrderingEntryPayload({
      source: { offerId: 2 },
      offerDetail,
      bindings: {},
      bindingLocks: {},
      placementContext: {
        placementInstanceId: "12",
        matchingContext: { prId: 29 },
      },
    });

    expect(payload).not.toBeNull();
    expect(payload?.placementContext).toBeUndefined();
  });
});
