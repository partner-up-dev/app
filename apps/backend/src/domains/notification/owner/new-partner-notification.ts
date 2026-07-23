import type { NotificationRequest, NotificationRequestResult } from "../contracts";
import { requestNewPartnerNotification } from "./notification-owner.service";
import type { NotificationTaskSchedulerPort } from "./ports";

/**
 * Narrow semantic scheduler used only by the active-admission handoff. It
 * accepts no Job, provider, timing or private-key fields from PR.
 */
export interface NewPartnerNotificationSchedulerPort {
  request(input: NotificationRequest<"pr.new-partner">): Promise<NotificationRequestResult>;
}

export const createNewPartnerNotificationSchedulerPort = (input: {
  scheduler: Pick<NotificationTaskSchedulerPort, "enqueueOncePerCause">;
  now?: () => Date;
}): NewPartnerNotificationSchedulerPort => {
  const now = input.now ?? (() => new Date());

  return {
    request: (request) =>
      requestNewPartnerNotification({
        request,
        scheduler: input.scheduler,
        requestedAt: now(),
      }),
  };
};
