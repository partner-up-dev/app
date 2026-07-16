import type { MeetingPointConfig } from "../../../entities/meeting-point";
import {
  normalizeMeetingPointConfig,
  normalizeMeetingPointConfigMap,
} from "../../../entities/meeting-point";
import type { PartnerRequest } from "../../../entities/partner-request";
import { PRTypeConfigRepository } from "../../../repositories/PRTypeConfigRepository";
import { resolvePublishedPoiByLocation } from "../../poi";

const prTypeConfigRepo = new PRTypeConfigRepository();

export type MeetingPointSource = "PR" | "PR_TYPE_LOCATION" | "PR_TYPE" | "POI";

export type EffectiveMeetingPoint = MeetingPointConfig & {
  source: MeetingPointSource;
};

const withSource = (
  source: MeetingPointSource,
  config: MeetingPointConfig | null,
): EffectiveMeetingPoint | null =>
  config
    ? {
        source,
        description: config.description,
        imageUrl: config.imageUrl,
      }
    : null;

const normalizeLocation = (location: string | null): string | null => {
  const normalized = location?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
};

export const resolveEffectiveMeetingPoint = async (
  request: Pick<PartnerRequest, "type" | "location" | "meetingPoint">,
): Promise<EffectiveMeetingPoint | null> => {
  const prMeetingPoint = withSource("PR", normalizeMeetingPointConfig(request.meetingPoint));
  if (prMeetingPoint) {
    return prMeetingPoint;
  }

  const location = normalizeLocation(request.location);
  if (location === null) {
    return null;
  }

  const config = await prTypeConfigRepo.findByType(request.type);
  if (config) {
    const locationMeetingPoints = normalizeMeetingPointConfigMap(config.locationMeetingPoints);
    const typeLocationMeetingPoint = withSource(
      "PR_TYPE_LOCATION",
      locationMeetingPoints[location] ?? null,
    );
    if (typeLocationMeetingPoint) {
      return typeLocationMeetingPoint;
    }

    const typeMeetingPoint = withSource(
      "PR_TYPE",
      normalizeMeetingPointConfig(config.meetingPoint),
    );
    if (typeMeetingPoint) {
      return typeMeetingPoint;
    }
  }

  const poi = await resolvePublishedPoiByLocation(location);
  return withSource("POI", normalizeMeetingPointConfig(poi?.meetingPoint));
};

export const areEffectiveMeetingPointsEqual = (
  left: EffectiveMeetingPoint | null,
  right: EffectiveMeetingPoint | null,
): boolean =>
  (left?.description ?? null) === (right?.description ?? null) &&
  (left?.imageUrl ?? null) === (right?.imageUrl ?? null);

export const resolveMeetingPointNotificationDescription = (
  meetingPoint: EffectiveMeetingPoint | null,
): string | null => {
  const description = meetingPoint?.description?.trim() ?? "";
  return description.length > 0 ? description : null;
};
