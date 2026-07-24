import {
  createAdminPoiMeetingPointTransactionPort,
  type AdminPoiUpdateInput,
} from "./admin-poi-meeting-point-transaction";
import type { AdminPoiSnapshot } from "../contracts";
import { toAdminPoiSnapshot } from "../services/admin-poi-projection";

/**
 * Admin-facing POI mutation entrypoint. HTTP stays responsible for protocol
 * validation and response projection; this use case owns source semantics.
 */
export const updateAdminPoi = async (input: {
  poiId: number;
  input: AdminPoiUpdateInput;
}): Promise<AdminPoiSnapshot> =>
  toAdminPoiSnapshot(await createAdminPoiMeetingPointTransactionPort().update(input));

export type { AdminPoiUpdateInput } from "./admin-poi-meeting-point-transaction";
