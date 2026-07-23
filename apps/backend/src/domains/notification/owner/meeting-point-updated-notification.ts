import type { NotificationRequest, NotificationRequestResult } from "../contracts";
import { requestMeetingPointUpdatedNotification } from "./notification-owner.service";
import type { NotificationTaskSchedulerPort } from "./ports";

/**
 * Narrow semantic scheduler for one committed effective meeting-point change.
 * Source owners cannot select a Job type, provider binding, timing or private
 * once-per-cause identity.
 */
export interface MeetingPointUpdatedNotificationSchedulerPort {
  request(
    input: NotificationRequest<"pr.meeting-point-updated">,
  ): Promise<NotificationRequestResult>;
}

export const createMeetingPointUpdatedNotificationSchedulerPort = (input: {
  scheduler: Pick<NotificationTaskSchedulerPort, "enqueueOncePerCause">;
  now?: () => Date;
}): MeetingPointUpdatedNotificationSchedulerPort => {
  const now = input.now ?? (() => new Date());

  return {
    request: (request) =>
      requestMeetingPointUpdatedNotification({
        request,
        scheduler: input.scheduler,
        requestedAt: now(),
      }),
  };
};
