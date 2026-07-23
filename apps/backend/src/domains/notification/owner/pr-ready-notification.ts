import type { NotificationRequest, NotificationRequestResult } from "../contracts";
import { requestPRReadyNotification } from "./notification-owner.service";
import type { NotificationTaskSchedulerPort } from "./ports";

/**
 * Narrow semantic scheduler used only by the PR-ready transition handoff. PR
 * cannot choose a Job type, provider binding, timing or private creation key.
 */
export interface PRReadyNotificationSchedulerPort {
  request(input: NotificationRequest<"pr.ready">): Promise<NotificationRequestResult>;
}

export const createPRReadyNotificationSchedulerPort = (input: {
  scheduler: Pick<NotificationTaskSchedulerPort, "enqueueOncePerCause">;
  now?: () => Date;
}): PRReadyNotificationSchedulerPort => {
  const now = input.now ?? (() => new Date());

  return {
    request: (request) =>
      requestPRReadyNotification({
        request,
        scheduler: input.scheduler,
        requestedAt: now(),
      }),
  };
};
