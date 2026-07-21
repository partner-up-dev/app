import { throwRentalRuntimeRetired } from "../../../lib/rental-runtime-retirement";

export async function rejectRentalBooking(_input: {
  fulfillmentId: string;
  bookingNote?: string | null;
}) {
  return throwRentalRuntimeRetired();
}
