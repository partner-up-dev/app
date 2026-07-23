import type {
  BusinessNotificationTemplate,
  NotificationAcknowledgementRequest,
  NotificationAcknowledgementResult,
  NotificationCancellationRequest,
  NotificationCancellationResult,
  NotificationInvalidationRequest,
  NotificationInvalidationResult,
  NotificationRequest,
  NotificationRequestResult,
} from "./contracts";
import { getNotificationOwner } from "./owner/runtime";
export {
  clearPRMessageNotificationPermission,
  updatePRMessageNotificationSubscription,
} from "./pr-message-subscription";
export type {
  PRMessageNotificationSubscriptionAction,
  PRMessageNotificationSubscriptionState,
  PRMessageNotificationSubscriptionUpdate,
  PRMessageNotificationSubscriptionUpdateResult,
} from "./pr-message-subscription";

/**
 * Requests a business notification. Notification owns timing, Job creation,
 * private dedupe and provider binding; callers provide only semantic facts.
 */
export const requestNotification = <Template extends BusinessNotificationTemplate>(
  input: NotificationRequest<Template>,
): Promise<NotificationRequestResult> => getNotificationOwner().request(input);

/** Cancels mutable notification work using business identity only. */
export const cancelNotification = (
  input: NotificationCancellationRequest,
): Promise<NotificationCancellationResult> => getNotificationOwner().cancel(input);

/** Stops a current attention window through Notification's semantic scope. */
export const invalidateNotification = (
  input: NotificationInvalidationRequest,
): Promise<NotificationInvalidationResult> => getNotificationOwner().invalidate(input);

/** A visible-thread attention acknowledgement; Notification retains Job mapping. */
export const acknowledgeNotification = (
  input: NotificationAcknowledgementRequest,
): Promise<NotificationAcknowledgementResult> => getNotificationOwner().acknowledge(input);
