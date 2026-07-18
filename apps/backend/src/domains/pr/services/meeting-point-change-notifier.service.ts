import type { PartnerRequest, PRId } from "../../../entities/partner-request";
import { scheduleWeChatMeetingPointUpdatedNotifications } from "../../../infra/notifications";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import {
  areEffectiveMeetingPointsEqual,
  type EffectiveMeetingPoint,
  resolveEffectiveMeetingPoint,
  resolveMeetingPointNotificationDescription,
} from "./meeting-point.service";

const prRepo = new PartnerRequestRepository();

export type MeetingPointSnapshot = Map<PRId, EffectiveMeetingPoint | null>;

const dedupeRequests = (requests: PartnerRequest[]): PartnerRequest[] => {
  const byId = new Map<PRId, PartnerRequest>();
  for (const request of requests) {
    byId.set(request.id, request);
  }
  return Array.from(byId.values());
};

export const captureEffectiveMeetingPointsForRequests = async (
  requests: PartnerRequest[],
): Promise<MeetingPointSnapshot> => {
  const result: MeetingPointSnapshot = new Map();
  for (const request of dedupeRequests(requests)) {
    result.set(request.id, await resolveEffectiveMeetingPoint(request));
  }
  return result;
};

export const scheduleMeetingPointNotificationsForChangedRequests = async (input: {
  previous: MeetingPointSnapshot;
  requests: PartnerRequest[];
  updatedAt: Date;
}): Promise<void> => {
  for (const request of dedupeRequests(input.requests)) {
    const previousMeetingPoint = input.previous.get(request.id) ?? null;
    const nextMeetingPoint = await resolveEffectiveMeetingPoint(request);
    if (areEffectiveMeetingPointsEqual(previousMeetingPoint, nextMeetingPoint)) {
      continue;
    }

    const meetingPointDescription = resolveMeetingPointNotificationDescription(nextMeetingPoint);
    if (!meetingPointDescription) {
      continue;
    }

    await scheduleWeChatMeetingPointUpdatedNotifications({
      request,
      meetingPointDescription,
      updatedAt: input.updatedAt,
    });
  }
};

export const listRequestsAffectedByPRTypeMeetingPoint = async (
  previousType: string,
  nextType: string,
): Promise<PartnerRequest[]> => {
  const [previousTypeRequests, nextTypeRequests] = await Promise.all([
    prRepo.findByType(previousType),
    previousType === nextType ? Promise.resolve([]) : prRepo.findByType(nextType),
  ]);
  return dedupeRequests([...previousTypeRequests, ...nextTypeRequests]);
};

export const listRequestsAffectedByPoiMeetingPoint = async (
  poiId: string,
): Promise<PartnerRequest[]> => {
  const requests = await prRepo.listAll();
  return requests.filter((request) => request.location === poiId);
};
