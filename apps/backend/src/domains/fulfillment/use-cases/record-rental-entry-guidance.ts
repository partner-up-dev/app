import { throwRentalRuntimeRetired } from "../../../lib/rental-runtime-retirement";

export async function recordRentalEntryGuidance(_input: {
  fulfillmentId: string;
  entryByPhone?: string | null;
  entryByRealName?: string | null;
  note?: string | null;
}) {
  return throwRentalRuntimeRetired();
}
