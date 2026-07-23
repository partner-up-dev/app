import type { PartnerRequest, PRId } from "../../../entities/partner-request";
import {
  areEffectiveMeetingPointsEqual,
  type EffectiveMeetingPoint,
  resolveEffectiveMeetingPoint,
  resolveMeetingPointNotificationDescription,
} from "./meeting-point.service";

export type MeetingPointSnapshot = Map<PRId, EffectiveMeetingPoint | null>;
export type EffectiveMeetingPointResolver = (
  request: PartnerRequest,
) => Promise<EffectiveMeetingPoint | null>;
export type MeetingPointNotificationChange = {
  request: PartnerRequest;
  meetingPointDescription: string;
};

const dedupeRequests = (requests: PartnerRequest[]): PartnerRequest[] => {
  const byId = new Map<PRId, PartnerRequest>();
  for (const request of requests) {
    byId.set(request.id, request);
  }
  return Array.from(byId.values());
};

export const captureEffectiveMeetingPointsForRequests = async (
  requests: PartnerRequest[],
  resolve: EffectiveMeetingPointResolver = resolveEffectiveMeetingPoint,
): Promise<MeetingPointSnapshot> => {
  const result: MeetingPointSnapshot = new Map();
  for (const request of dedupeRequests(requests)) {
    result.set(request.id, await resolve(request));
  }
  return result;
};

/**
 * Source-agnostic effective-change detector. It is intentionally pure with
 * respect to scheduling so transaction-owned writers can reuse it without a
 * domain-to-infrastructure side effect.
 */
export const collectMeetingPointNotificationChanges = async (input: {
  previous: MeetingPointSnapshot;
  requests: PartnerRequest[];
  resolve?: EffectiveMeetingPointResolver;
}): Promise<MeetingPointNotificationChange[]> => {
  const resolve = input.resolve ?? resolveEffectiveMeetingPoint;
  const changes: MeetingPointNotificationChange[] = [];
  for (const request of dedupeRequests(input.requests)) {
    const previousMeetingPoint = input.previous.get(request.id) ?? null;
    const nextMeetingPoint = await resolve(request);
    if (areEffectiveMeetingPointsEqual(previousMeetingPoint, nextMeetingPoint)) {
      continue;
    }

    const meetingPointDescription = resolveMeetingPointNotificationDescription(nextMeetingPoint);
    if (!meetingPointDescription) {
      continue;
    }

    changes.push({ request, meetingPointDescription });
  }
  return changes;
};
