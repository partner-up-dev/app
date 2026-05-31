import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { deriveRentalLifecycleStatus } from "../model/rental-fulfillment";
import { hasRideHailingProviderOrderReference } from "../model/ride-hailing-fulfillment";
import { resolveOrderPrepaidSettlementFulfillmentConsequence } from "./prepaid-settlement-consequence";

describe("rental fulfillment lifecycle", () => {
  it("keeps booking-pending rental fulfillment in pending lifecycle", () => {
    assert.equal(
      deriveRentalLifecycleStatus({
        bookingStatus: "PENDING_BOOKING",
        cancellationHandling: {
          status: "NONE",
        },
      }),
      "PENDING",
    );
  });

  it("treats confirmed rental booking as active until service ends", () => {
    assert.equal(
      deriveRentalLifecycleStatus({
        bookingStatus: "BOOKING_CONFIRMED",
        cancellationHandling: {
          status: "NONE",
        },
      }),
      "ACTIVE",
    );
  });

  it("treats handled supplier cancellation as cancelled lifecycle", () => {
    assert.equal(
      deriveRentalLifecycleStatus({
        bookingStatus: "BOOKING_CONFIRMED",
        cancellationHandling: {
          status: "HANDLED",
          supplierOutcome: "BOOKING_CANCELLED",
        },
      }),
      "CANCELLED",
    );
  });

  it("treats rejected booking as failed lifecycle", () => {
    assert.equal(
      deriveRentalLifecycleStatus({
        bookingStatus: "BOOKING_REJECTED",
        cancellationHandling: {
          status: "NONE",
        },
      }),
      "FAILED",
    );
  });
});

describe("ride-hailing fulfillment provider binding", () => {
  it("does not require a provider order reference while initiating", () => {
    assert.equal(
      hasRideHailingProviderOrderReference({
        providerOrderId: null,
      }),
      false,
    );
  });

  it("recognizes the provider order reference once established", () => {
    assert.equal(
      hasRideHailingProviderOrderReference({
        providerOrderId: "CC123456",
      }),
      true,
    );
  });
});

describe("order prepaid settlement fulfillment consequence", () => {
  it("routes Rental prepaid settlement to Rental fulfillment creation", () => {
    assert.deepEqual(
      resolveOrderPrepaidSettlementFulfillmentConsequence("RENTAL"),
      {
        kind: "CREATE_RENTAL_FULFILLMENT",
      },
    );
  });

  it("does not start RideHailing fulfillment from prepaid bill settlement", () => {
    assert.deepEqual(
      resolveOrderPrepaidSettlementFulfillmentConsequence("RIDE_HAILING"),
      {
        kind: "NONE",
        reason: "Order family has no prepaid settlement consequence",
      },
    );
  });
});
