import { throwHttpProblem } from "../../../lib/problem-details";
import { updatePRContent } from "../../pr";
import { type TimeWindowEntry } from "../../../entities/anchor-event";
import { validateAnchorParticipationPolicyOffsets } from "../../pr/services";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { PRId, PRJoinGateConfig, PRRoute } from "../../../entities";
import type { MeetingPointConfig } from "../../../entities";

const prRepo = new PartnerRequestRepository();

export interface UpdateAdminPRContentInput {
  title: string | null;
  type: string;
  timeWindow: TimeWindowEntry;
  location: string | null;
  route: PRRoute | null;
  minPartners: number | null;
  maxPartners: number | null;
  preferences: string[];
  notes: string | null;
  meetingPoint?: MeetingPointConfig | null;
  joinGateConfig?: PRJoinGateConfig;
  confirmationEnabled: boolean;
  confirmationStartOffsetMinutes: number;
  confirmationEndOffsetMinutes: number;
  joinLockOffsetMinutes: number;
}

const assertTimeWindowValid = (timeWindow: TimeWindowEntry) => {
  if (timeWindow[0] === null || timeWindow[1] === null) {
    return;
  }

  const startAt = new Date(timeWindow[0]);
  const endAt = new Date(timeWindow[1]);
  if (
    Number.isNaN(startAt.getTime()) ||
    Number.isNaN(endAt.getTime()) ||
    startAt.getTime() > endAt.getTime()
  ) {
    return throwHttpProblem({ status: 400, detail: "PR time window is invalid" });
  }
};

export async function updateAdminPRContent(
  prId: PRId,
  input: UpdateAdminPRContentInput,
) {
  const existing = await prRepo.findById(prId);
  if (!existing) {
    return throwHttpProblem({ status: 404, detail: "PR not found" });
  }

  assertTimeWindowValid(input.timeWindow);
  validateAnchorParticipationPolicyOffsets({
    confirmationEnabled: input.confirmationEnabled,
    confirmationStartOffsetMinutes: input.confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes: input.confirmationEndOffsetMinutes,
    joinLockOffsetMinutes: input.joinLockOffsetMinutes,
  });

  await updatePRContent(
    prId,
    {
      title: input.title ?? undefined,
      type: input.type,
      time: input.timeWindow,
      location: input.location,
      route: input.route,
      minPartners: input.minPartners,
      maxPartners: input.maxPartners,
      partners: [],
      budget: null,
      preferences: input.preferences,
      notes: input.notes,
      meetingPoint: input.meetingPoint ?? null,
    },
    null,
    {
      bypassEditableStatusGuard: true,
      bypassTypeImmutableGuard: true,
      bypassUserCreationPolicyGuard: true,
      preserveStatus: true,
    },
  );

  await prRepo.updatePartnerRules(prId, {
    confirmationEnabled: input.confirmationEnabled,
    confirmationStartOffsetMinutes: input.confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes: input.confirmationEndOffsetMinutes,
    joinLockOffsetMinutes: input.joinLockOffsetMinutes,
  });

  return await prRepo.updateJoinGateConfig(
    prId,
    input.joinGateConfig ?? existing.joinGateConfig,
  );
}
