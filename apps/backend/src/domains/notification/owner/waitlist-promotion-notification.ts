import type { NotificationRequest, NotificationRequestResult } from "../contracts";
import { requestWaitlistPromotedNotification } from "./notification-owner.service";
import type { NotificationTaskSchedulerPort } from "./ports";

/**
 * Semantic Notification capability used by the named PR waitlist-promotion
 * transaction integration. It is intentionally narrower than NotificationOwner
 * and carries no transaction, Job or provider fields in the request.
 */
export interface WaitlistPromotionNotificationPort {
  request(input: NotificationRequest<"pr.waitlist-promoted">): Promise<NotificationRequestResult>;
}

export const createWaitlistPromotionNotificationPort = (input: {
  scheduler: Pick<NotificationTaskSchedulerPort, "enqueueOncePerCause">;
  now?: () => Date;
}): WaitlistPromotionNotificationPort => {
  const now = input.now ?? (() => new Date());

  return {
    request: (request) =>
      requestWaitlistPromotedNotification({
        request,
        scheduler: input.scheduler,
        requestedAt: now(),
      }),
  };
};
