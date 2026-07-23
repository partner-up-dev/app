import { PoiRepository } from "../../../repositories/PoiRepository";
import { PRTypeConfigRepository } from "../../../repositories/PRTypeConfigRepository";
import type { TransactionExecutor } from "../../../repositories/_executor";
import { createEffectiveMeetingPointResolver } from "../services/meeting-point.service";

/**
 * Explicit integration adapter for source-owned meeting-point transactions.
 * It provides transaction-local PR-type and published-POI facts to PR's pure
 * resolution rule without exposing a generic transaction callback.
 */
export const createTransactionBoundEffectiveMeetingPointResolver = (
  executor: TransactionExecutor,
) => {
  const prTypeConfigRepo = new PRTypeConfigRepository(executor);
  const poiRepo = new PoiRepository(executor);

  return createEffectiveMeetingPointResolver({
    async findPRTypeMeetingPointPolicy(type) {
      const config = await prTypeConfigRepo.findByType(type);
      if (!config) {
        return null;
      }
      return {
        meetingPoint: config.meetingPoint,
        locationMeetingPoints: config.locationMeetingPoints,
      };
    },

    async findPublishedPoiByLocation(location) {
      const poi = await poiRepo.findByName(location);
      return poi ? { meetingPoint: poi.meetingPoint } : null;
    },
  });
};
