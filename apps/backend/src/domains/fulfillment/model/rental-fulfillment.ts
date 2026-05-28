import type { FulfillmentLifecycleStatus } from "./base";

export type RentalBookingStatus =
  | "PENDING_BOOKING"
  | "BOOKING_CONFIRMED"
  | "BOOKING_REJECTED";

export type RentalCancellationHandlingStatus =
  | "NONE"
  | "REQUESTED"
  | "HANDLING"
  | "HANDLED";

export type RentalSupplierCancellationOutcome =
  | "BOOKING_CANCELLED"
  | "BOOKING_REMAINS";

export type RentalFulfillment = {
  bookingStatus: RentalBookingStatus;
  cancellationHandling: {
    status: RentalCancellationHandlingStatus;
    supplierOutcome?: RentalSupplierCancellationOutcome | null;
  };
  serviceEndedAt?: string | null;
};

export const deriveRentalLifecycleStatus = (
  fulfillment: RentalFulfillment,
): FulfillmentLifecycleStatus => {
  if (fulfillment.bookingStatus === "BOOKING_REJECTED") {
    return "FAILED";
  }

  if (
    fulfillment.cancellationHandling.status === "HANDLED" &&
    fulfillment.cancellationHandling.supplierOutcome === "BOOKING_CANCELLED"
  ) {
    return "CANCELLED";
  }

  if (fulfillment.bookingStatus === "BOOKING_CONFIRMED") {
    if (fulfillment.serviceEndedAt) {
      return "COMPLETED";
    }

    return "ACTIVE";
  }

  return "PENDING";
};
