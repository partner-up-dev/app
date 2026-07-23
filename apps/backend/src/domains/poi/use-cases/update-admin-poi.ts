import type { Poi } from "../../../entities/poi";
import {
  createAdminPoiMeetingPointTransactionPort,
  type AdminPoiUpdateInput,
} from "./admin-poi-meeting-point-transaction";

/**
 * Admin-facing POI mutation entrypoint. HTTP stays responsible for protocol
 * validation and response projection; this use case owns source semantics.
 */
export const updateAdminPoi = async (input: {
  poiId: number;
  input: AdminPoiUpdateInput;
}): Promise<Poi> => await createAdminPoiMeetingPointTransactionPort().update(input);

export type { AdminPoiUpdateInput } from "./admin-poi-meeting-point-transaction";
