import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { hasParticipationPolicy } from "../services/participation-policy.service";
import { resolvePRPlaceDisplayName } from "../services/pr-place-mode.service";
import { getTimeWindowStart } from "../services/time-window.service";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();

export type ActivityStartReminderNotificationContextInput = {
  prId: number;
  recipientUserId: string;
};

export type ActivityStartReminderNotificationContext =
  | {
      state: "READY";
      activityStartAt: string;
      activityName: string;
      location: string;
    }
  | {
      state: "SKIPPED";
      reason:
        | "PR_MISSING_OR_UNSUPPORTED"
        | "RECIPIENT_NOT_ACTIVE_PARTICIPANT"
        | "ACTIVITY_START_UNAVAILABLE";
    };

export type ActivityStartReminderSchedulingContext =
  | { state: "READY"; activityStartAt: string }
  | Extract<ActivityStartReminderNotificationContext, { state: "SKIPPED" }>;

const resolveActivityName = (input: { id: number; title: string | null; type: string }): string => {
  const values = [input.type.trim(), input.title?.trim() ?? ""].filter(
    (value, index, all) => value.length > 0 && all.indexOf(value) === index,
  );
  return values.length > 0 ? values.join(" ") : `活动 #${input.id}`;
};

const loadCurrentActivity = async (input: ActivityStartReminderNotificationContextInput) => {
  const [request, participant] = await Promise.all([
    prRepo.findById(input.prId),
    partnerRepo.findActiveByPrIdAndUserId(input.prId, input.recipientUserId),
  ]);
  if (!request || !hasParticipationPolicy(request)) {
    return { state: "SKIPPED", reason: "PR_MISSING_OR_UNSUPPORTED" } as const;
  }
  if (!participant) {
    return { state: "SKIPPED", reason: "RECIPIENT_NOT_ACTIVE_PARTICIPANT" } as const;
  }
  const activityStartAt = getTimeWindowStart(request.time);
  if (!activityStartAt) {
    return { state: "SKIPPED", reason: "ACTIVITY_START_UNAVAILABLE" } as const;
  }
  return { state: "READY", request, activityStartAt } as const;
};

/** Minimal creation-time projection; it intentionally performs no rendering. */
export const getActivityStartReminderSchedulingContext = async (
  input: ActivityStartReminderNotificationContextInput,
): Promise<ActivityStartReminderSchedulingContext> => {
  const current = await loadCurrentActivity(input);
  return current.state === "SKIPPED"
    ? current
    : { state: "READY", activityStartAt: current.activityStartAt.toISOString() };
};

/** Current PR-owned facts used only at activity-reminder dispatch time. */
export const getActivityStartReminderNotificationContext = async (
  input: ActivityStartReminderNotificationContextInput,
): Promise<ActivityStartReminderNotificationContext> => {
  const current = await loadCurrentActivity(input);
  if (current.state === "SKIPPED") {
    return current;
  }

  return {
    state: "READY",
    activityStartAt: current.activityStartAt.toISOString(),
    activityName: resolveActivityName(current.request),
    location: resolvePRPlaceDisplayName(current.request) ?? "地点待定",
  };
};
