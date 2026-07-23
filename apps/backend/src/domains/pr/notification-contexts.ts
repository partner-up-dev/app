/**
 * Curated PR projections consumed by Notification runtime composition.
 *
 * This intentionally avoids the broad PR query barrel: Notification needs
 * only these revalidation contexts, and broad import-time composition can
 * re-enter legacy Notification compatibility modules.
 */
export {
  getActivityStartReminderNotificationContext,
  getActivityStartReminderSchedulingContext,
  type ActivityStartReminderNotificationContext,
  type ActivityStartReminderNotificationContextInput,
  type ActivityStartReminderSchedulingContext,
} from "./queries/get-activity-start-reminder-notification-context";
export {
  getWaitlistPromotedNotificationContext,
  type WaitlistPromotedNotificationContext,
  type WaitlistPromotedNotificationContextInput,
} from "./queries/get-waitlist-promoted-notification-context";
export {
  getConfirmationReminderNotificationContext,
  getConfirmationReminderSchedulingContext,
  type ConfirmationReminderNotificationContext,
  type ConfirmationReminderNotificationContextInput,
  type ConfirmationReminderSchedulingContext,
} from "./queries/get-confirmation-reminder-notification-context";
export {
  getNewPartnerNotificationContext,
  type NewPartnerNotificationContext,
  type NewPartnerNotificationContextInput,
} from "./queries/get-new-partner-notification-context";
export {
  getPRReadyNotificationContext,
  type PRReadyNotificationContext,
  type PRReadyNotificationContextInput,
} from "./queries/get-pr-ready-notification-context";
export {
  getMeetingPointUpdatedNotificationContext,
  type MeetingPointUpdatedNotificationContext,
  type MeetingPointUpdatedNotificationContextInput,
} from "./queries/get-meeting-point-updated-notification-context";
export {
  getWaitlistAlternativeAvailableNotificationContext,
  type WaitlistAlternativeAvailableNotificationContext,
  type WaitlistAlternativeAvailableNotificationContextInput,
} from "./queries/get-waitlist-alternative-available-notification-context";
export {
  getPRMessageSummaryNotificationContext,
  type PRMessageSummaryNotificationContext,
  type PRMessageSummaryNotificationContextInput,
} from "./queries/get-pr-message-summary-notification-context";
