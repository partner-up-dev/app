import type { FulfillmentLifecycleStatus } from "./base";

export type RidePhase =
  | "DISPATCHING"
  | "DRIVER_ACCEPTED"
  | "DRIVER_ARRIVING"
  | "IN_TRIP"
  | "TRIP_FINISHED_AS_PLANNED"
  | "TRIP_FINISHED_UNEXPECTED"
  | "ABORTED_BEFORE_TRIP";

export type RideHailingFulfillment = {
  ridePhase: RidePhase;
  finalSettlementInputCommittedAt?: string | null;
  failedAt?: string | null;
};

export const deriveRideLifecycleStatus = (
  fulfillment: RideHailingFulfillment,
): FulfillmentLifecycleStatus => {
  if (fulfillment.failedAt) {
    return "FAILED";
  }

  if (fulfillment.ridePhase === "ABORTED_BEFORE_TRIP") {
    return "CANCELLED";
  }

  if (fulfillment.ridePhase === "IN_TRIP") {
    return "ACTIVE";
  }

  if (
    fulfillment.ridePhase === "TRIP_FINISHED_AS_PLANNED" ||
    fulfillment.ridePhase === "TRIP_FINISHED_UNEXPECTED"
  ) {
    return fulfillment.finalSettlementInputCommittedAt ? "COMPLETED" : "ACTIVE";
  }

  return "PENDING";
};
