import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { deriveRentalLifecycleStatus } from "../model/rental-fulfillment";
import { deriveRideLifecycleStatus } from "../model/ride-hailing-fulfillment";

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

describe("ride-hailing fulfillment lifecycle", () => {
  it("keeps pre-trip phases in pending lifecycle", () => {
    assert.equal(
      deriveRideLifecycleStatus({
        ridePhase: "DRIVER_ARRIVING",
      }),
      "PENDING",
    );
  });

  it("treats in-trip ride as active lifecycle", () => {
    assert.equal(
      deriveRideLifecycleStatus({
        ridePhase: "IN_TRIP",
      }),
      "ACTIVE",
    );
  });

  it("requires final settlement input commit before completed lifecycle", () => {
    assert.equal(
      deriveRideLifecycleStatus({
        ridePhase: "TRIP_FINISHED_AS_PLANNED",
      }),
      "ACTIVE",
    );

    assert.equal(
      deriveRideLifecycleStatus({
        ridePhase: "TRIP_FINISHED_AS_PLANNED",
        finalSettlementInputCommittedAt: "2026-05-28T10:01:00.000Z",
      }),
      "COMPLETED",
    );
  });

  it("treats pre-trip abort as cancelled lifecycle", () => {
    assert.equal(
      deriveRideLifecycleStatus({
        ridePhase: "ABORTED_BEFORE_TRIP",
      }),
      "CANCELLED",
    );
  });
});
