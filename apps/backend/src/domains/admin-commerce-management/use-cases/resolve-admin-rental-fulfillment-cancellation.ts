import { throwRentalRuntimeRetired } from "../../../lib/rental-runtime-retirement";

export async function resolveAdminRentalFulfillmentCancellation(_input: {
  fulfillmentId: string;
  outcome: "APPROVED" | "DENIED";
  reason?: string | null;
}) {
  return throwRentalRuntimeRetired();
}
