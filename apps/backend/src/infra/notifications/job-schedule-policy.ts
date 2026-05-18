import type { ScheduleOnceConfig } from "../jobs/job-runner";
import { NO_LATE_TOLERANCE_UNITS } from "../jobs/schedule-timing";
import type { ConfirmationReminderTrigger } from "../../entities/notification-delivery";

export type JobSchedulePolicy = Required<Pick<
  ScheduleOnceConfig,
  "resolutionMs" | "earlyToleranceUnits" | "lateToleranceUnits"
>>;

const SECOND_RESOLUTION_MS = 1_000;
const PRECISE_RESOLUTION_MS = 1;
const FIVE_MINUTE_RESOLUTION_MS = 5 * 60 * 1_000;

export const confirmationStartReminderSchedulePolicy: JobSchedulePolicy = {
  resolutionMs: PRECISE_RESOLUTION_MS,
  earlyToleranceUnits: 0,
  lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
};

export const confirmationEndReminderSchedulePolicy: JobSchedulePolicy = {
  resolutionMs: FIVE_MINUTE_RESOLUTION_MS,
  earlyToleranceUnits: 3,
  lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
};

export const resolveConfirmationReminderSchedulePolicy = (
  trigger: ConfirmationReminderTrigger,
): JobSchedulePolicy =>
  trigger === "CONFIRM_START"
    ? confirmationStartReminderSchedulePolicy
    : confirmationEndReminderSchedulePolicy;

export const activityStartReminderSchedulePolicy: JobSchedulePolicy = {
  resolutionMs: SECOND_RESOLUTION_MS,
  earlyToleranceUnits: 0,
  lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
};

export const newPartnerSchedulePolicy: JobSchedulePolicy = {
  resolutionMs: SECOND_RESOLUTION_MS,
  earlyToleranceUnits: 0,
  lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
};

export const meetingPointUpdatedSchedulePolicy: JobSchedulePolicy = {
  resolutionMs: SECOND_RESOLUTION_MS,
  earlyToleranceUnits: 0,
  lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
};

export const waitlistPromotedSchedulePolicy: JobSchedulePolicy = {
  resolutionMs: SECOND_RESOLUTION_MS,
  earlyToleranceUnits: 0,
  lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
};

export const waitlistAlternativeAvailableSchedulePolicy: JobSchedulePolicy = {
  resolutionMs: SECOND_RESOLUTION_MS,
  earlyToleranceUnits: 0,
  lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
};

export const prMessageSchedulePolicy: JobSchedulePolicy = {
  resolutionMs: SECOND_RESOLUTION_MS,
  earlyToleranceUnits: 0,
  lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
};
