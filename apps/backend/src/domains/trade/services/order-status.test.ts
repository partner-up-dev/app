import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { TradeOrder } from "../model";
import {
  canRequestOrderTermination,
  markInitiatingOrderFailed,
  markInitiatingOrderOpen,
} from "./index";

const buildOrder = (status: TradeOrder["status"]): TradeOrder => ({
  id: "order-1",
  family: "RIDE_HAILING",
  createdBy: "user-1",
  status,
  participants: [],
  splitRuleSnapshot: {
    type: "RELATIVE",
    shares: [],
  },
  offerSnapshot: {
    offerId: 1,
    termsVersion: 1,
    productType: "RIDE_HAILING",
  },
  items: [],
  pricingSnapshot: {
    currency: "CNY",
    itemBreakdowns: [],
    orderLevelExplanations: [],
    subtotalFen: 0,
    totalFen: 0,
  },
  timeout: {
    unpaidExpiresAt: "2031-01-01T00:30:00.000Z",
    defaultWindowMinutes: 30,
  },
  terminationAttempts: [],
});

describe("order initiating status transitions", () => {
  it("opens an initiating order after provider boundary is established", () => {
    const next = markInitiatingOrderOpen(buildOrder("INITIATING"));

    assert.equal(next.status, "OPEN");
  });

  it("fails an initiating order after provider hard failure", () => {
    const next = markInitiatingOrderFailed(buildOrder("INITIATING"));

    assert.equal(next.status, "FAILED");
  });

  it("rejects non-initiating transition shortcuts", () => {
    assert.throws(
      () => markInitiatingOrderOpen(buildOrder("OPEN")),
      /Order is not initiating/,
    );
  });

  it("does not allow termination while the order is initiating", () => {
    assert.equal(canRequestOrderTermination(buildOrder("INITIATING")), false);
  });
});
