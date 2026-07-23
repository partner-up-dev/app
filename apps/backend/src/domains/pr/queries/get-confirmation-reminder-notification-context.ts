import type { PRId } from "../../../entities/partner-request";
import type { PartnerId } from "../../../entities/partner";
import type { UserId } from "../../../entities/user";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import {
  hasEnabledConfirmationPolicy,
  hasParticipationPolicy,
  resolveParticipationPolicy,
} from "../services/participation-policy.service";
import { getTimeWindowStart } from "../services/time-window.service";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();

export type ConfirmationReminderNotificationContextInput = {
  prId: PRId;
  slotId: PartnerId;
  recipientUserId: UserId;
};

export type ConfirmationReminderSchedulingContext =
  | { state: "READY"; confirmationStartAt: string | null; confirmationEndAt: string | null }
  | {
      state: "SKIPPED";
      reason:
        | "PR_MISSING_OR_UNSUPPORTED"
        | "RECIPIENT_NOT_ACTIVE_PARTICIPANT"
        | "ACTIVITY_START_UNAVAILABLE"
        | "CONFIRMATION_POLICY_UNAVAILABLE"
        | "CONFIRMATION_TRIGGER_UNAVAILABLE";
    };

export type ConfirmationReminderNotificationContext =
  | {
      state: "READY";
      confirmationStartAt: string | null;
      confirmationEndAt: string | null;
      title: string;
      activityStartAt: string;
    }
  | Extract<ConfirmationReminderSchedulingContext, { state: "SKIPPED" }>;

const resolveTitle = (request: { id: PRId; title: string | null; type: string }): string => {
  const title = request.title?.trim();
  return title || request.type.trim() || `活动 #${request.id}`;
};

const loadCurrent = async (input: ConfirmationReminderNotificationContextInput) => {
  const [request, slot] = await Promise.all([
    prRepo.findById(input.prId),
    partnerRepo.findActiveParticipantSummaryByPrIdAndPartnerId(input.prId, input.slotId),
  ]);
  if (!request) {
    return { state: "SKIPPED", reason: "PR_MISSING_OR_UNSUPPORTED" } as const;
  }
  if (!hasParticipationPolicy(request) || !hasEnabledConfirmationPolicy(request)) {
    return { state: "SKIPPED", reason: "CONFIRMATION_POLICY_UNAVAILABLE" } as const;
  }
  if (!slot || slot.userId !== input.recipientUserId) {
    return { state: "SKIPPED", reason: "RECIPIENT_NOT_ACTIVE_PARTICIPANT" } as const;
  }

  const activityStartAt = getTimeWindowStart(request.time);
  if (!activityStartAt || activityStartAt.getTime() <= Date.now()) {
    return { state: "SKIPPED", reason: "ACTIVITY_START_UNAVAILABLE" } as const;
  }

  const policy = resolveParticipationPolicy(request, request.time);
  return { state: "READY", request, policy, activityStartAt } as const;
};

export const getConfirmationReminderSchedulingContext = async (
  input: ConfirmationReminderNotificationContextInput,
): Promise<ConfirmationReminderSchedulingContext> => {
  const current = await loadCurrent(input);
  return current.state === "SKIPPED"
    ? current
    : {
        state: "READY",
        confirmationStartAt: current.policy.confirmationStartAt?.toISOString() ?? null,
        confirmationEndAt: current.policy.confirmationEndAt?.toISOString() ?? null,
      };
};

export const getConfirmationReminderNotificationContext = async (
  input: ConfirmationReminderNotificationContextInput,
): Promise<ConfirmationReminderNotificationContext> => {
  const current = await loadCurrent(input);
  if (current.state === "SKIPPED") return current;
  return {
    state: "READY",
    confirmationStartAt: current.policy.confirmationStartAt?.toISOString() ?? null,
    confirmationEndAt: current.policy.confirmationEndAt?.toISOString() ?? null,
    title: resolveTitle(current.request),
    activityStartAt: current.activityStartAt.toISOString(),
  };
};
