import type { MeetingPointConfig, MeetingPointConfigMap } from "../../../entities/meeting-point";
import {
  normalizeMeetingPointConfig,
  normalizeMeetingPointConfigMap,
} from "../../../entities/meeting-point";
import type { PartnerRequest } from "../../../entities/partner-request";
// Depend on POI's low-level query surface rather than its public barrel: the
// latter also exports POI mutation use cases, which depend on this PR rule.
import { resolvePublishedPoiByLocation } from "../../poi/queries";
import { getPRTypeConfigMeetingPointPolicy } from "../../pr-type-config/queries";

export type MeetingPointSource = "PR" | "PR_TYPE_LOCATION" | "PR_TYPE" | "POI";

export type EffectiveMeetingPoint = MeetingPointConfig & {
  source: MeetingPointSource;
};

export type MeetingPointResolutionReader = {
  findPRTypeMeetingPointPolicy(type: string): Promise<{
    meetingPoint: MeetingPointConfig | null;
    locationMeetingPoints: MeetingPointConfigMap;
  } | null>;
  findPublishedPoiByLocation(location: string): Promise<{
    meetingPoint: MeetingPointConfig | null;
  } | null>;
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

const defaultMeetingPointResolutionReader: MeetingPointResolutionReader = {
  findPRTypeMeetingPointPolicy: getPRTypeConfigMeetingPointPolicy,
  findPublishedPoiByLocation: resolvePublishedPoiByLocation,
};

const resolveEffectiveMeetingPointWithReader = async (
  reader: MeetingPointResolutionReader,
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

  const config = await reader.findPRTypeMeetingPointPolicy(request.type);
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

  const poi = await reader.findPublishedPoiByLocation(location);
  return withSource("POI", normalizeMeetingPointConfig(poi?.meetingPoint));
};

/**
 * The caller can bind explicit transaction-local readers without giving this
 * pure resolution rule a database or source-owner dependency.
 */
export const createEffectiveMeetingPointResolver =
  (
    reader: MeetingPointResolutionReader,
  ): ((
    request: Pick<PartnerRequest, "type" | "location" | "meetingPoint">,
  ) => Promise<EffectiveMeetingPoint | null>) =>
  async (request) =>
    await resolveEffectiveMeetingPointWithReader(reader, request);

export const resolveEffectiveMeetingPoint = createEffectiveMeetingPointResolver(
  defaultMeetingPointResolutionReader,
);

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
