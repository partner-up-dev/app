import type { PartnerRequest } from "../../../entities/partner-request";
import type { MeetingPointConfig } from "../../../entities/meeting-point";
import {
  normalizeMeetingPointConfig,
  normalizeMeetingPointConfigMap,
} from "../../../entities/meeting-point";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { resolvePublishedPoiByLocation } from "../../poi";

const anchorEventRepo = new AnchorEventRepository();

export type MeetingPointSource =
  | "PR"
  | "ANCHOR_EVENT_LOCATION"
  | "ANCHOR_EVENT"
  | "POI";

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
  const prMeetingPoint = withSource(
    "PR",
    normalizeMeetingPointConfig(request.meetingPoint),
  );
  if (prMeetingPoint) {
    return prMeetingPoint;
  }

  const location = normalizeLocation(request.location);
  if (location === null) {
    return null;
  }

  const event = await anchorEventRepo.findOneByType(request.type);
  if (event) {
    const locationMeetingPoints = normalizeMeetingPointConfigMap(
      event.locationMeetingPoints,
    );
    const eventLocationMeetingPoint = withSource(
      "ANCHOR_EVENT_LOCATION",
      locationMeetingPoints[location] ?? null,
    );
    if (eventLocationMeetingPoint) {
      return eventLocationMeetingPoint;
    }

    const eventMeetingPoint = withSource(
      "ANCHOR_EVENT",
      normalizeMeetingPointConfig(event.meetingPoint),
    );
    if (eventMeetingPoint) {
      return eventMeetingPoint;
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
