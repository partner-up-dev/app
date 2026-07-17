import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { resolveOrderPrepaidSettlementFulfillmentConsequence } from "./prepaid-settlement-consequence";

describe("order prepaid settlement execution consequence", () => {
  it("routes Rental prepaid settlement to Rental booking activation", () => {
    assert.deepEqual(resolveOrderPrepaidSettlementFulfillmentConsequence("RENTAL"), {
      kind: "ACTIVATE_RENTAL_BOOKING",
    });
  });

  it("does not start RideHailing execution from prepaid bill settlement", () => {
    assert.deepEqual(resolveOrderPrepaidSettlementFulfillmentConsequence("RIDE_HAILING"), {
      kind: "NONE",
      reason: "Order family has no prepaid settlement consequence",
    });
  });
});
