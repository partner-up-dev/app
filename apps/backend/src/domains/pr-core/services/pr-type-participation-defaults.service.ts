import type { PartnerRequest, PRId, PRJoinGateConfig } from "../../../entities";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { buildMaterializedPRJoinGateConfig } from "./join-gates.service";
import { hasParticipationPolicy } from "./participation-policy.service";

const prRepo = new PartnerRequestRepository();

export type PRTypeParticipationDefaults = {
  defaultConfirmationEnabled: boolean;
  defaultConfirmationStartOffsetMinutes: number;
  defaultConfirmationEndOffsetMinutes: number;
  defaultJoinLockOffsetMinutes: number;
  joinGateConfig: PRJoinGateConfig;
};

/** Materializes the participation snapshot once and always preserves PR-owned gates. */
export async function materializePRTypeParticipationSnapshot(input: {
  prId: PRId;
  currentPR?: Pick<
    PartnerRequest,
    | "confirmationEnabled"
    | "confirmationStartOffsetMinutes"
    | "confirmationEndOffsetMinutes"
    | "joinLockOffsetMinutes"
  > | null;
  defaults?: PRTypeParticipationDefaults | null;
  prJoinGateConfig?: PRJoinGateConfig;
}): Promise<void> {
  const currentPR = input.currentPR ?? (await prRepo.findById(input.prId));
  if (input.defaults && currentPR && !hasParticipationPolicy(currentPR)) {
    await prRepo.updatePartnerRules(input.prId, {
      confirmationEnabled: input.defaults.defaultConfirmationEnabled,
      confirmationStartOffsetMinutes: input.defaults.defaultConfirmationStartOffsetMinutes,
      confirmationEndOffsetMinutes: input.defaults.defaultConfirmationEndOffsetMinutes,
      joinLockOffsetMinutes: input.defaults.defaultJoinLockOffsetMinutes,
    });
  }

  if (!input.defaults && input.prJoinGateConfig === undefined) return;

  await prRepo.updateJoinGateConfig(
    input.prId,
    buildMaterializedPRJoinGateConfig({
      prTypeConfig: input.defaults,
      prGates: input.prJoinGateConfig,
    }),
  );
}
