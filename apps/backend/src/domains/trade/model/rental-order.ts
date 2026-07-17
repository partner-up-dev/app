import type { TradeOrder } from "./order";

export type RentalBookingStatus = "PENDING_BOOKING" | "BOOKING_CONFIRMED" | "BOOKING_REJECTED";

export type RentalCancellationHandlingStatus = "NONE" | "REQUESTED" | "HANDLING" | "HANDLED";

export type RentalSupplierCancellationOutcome = "BOOKING_CANCELLED" | "BOOKING_REMAINS";

export type RentalEntryGuidance = {
  entryByPhone?: string | null;
  entryByRealName?: string | null;
  note?: string | null;
};

export type RentalRegistrant = {
  name: string;
  phone?: string | null;
  nationalIdMasked?: string | null;
};

export type RentalOrder = Omit<TradeOrder, "family"> & {
  family: "RENTAL";
  serviceStartAt: string;
  serviceEndAt: string;
  contactPhone: string;
  registrants: RentalRegistrant[];
  bookingStatus: RentalBookingStatus;
  cancellationHandlingStatus: RentalCancellationHandlingStatus;
  supplierCancellationOutcome?: RentalSupplierCancellationOutcome | null;
  entryGuidance?: RentalEntryGuidance | null;
  bookingNote?: string | null;
  cancellationNote?: string | null;
  serviceEndedAt?: string | null;
};
