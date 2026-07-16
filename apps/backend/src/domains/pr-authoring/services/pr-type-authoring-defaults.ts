import type { PRId } from "../../../entities";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";

const prRepo = new PartnerRequestRepository();

export type PRTypeAuthoringDefaults = {
  defaultNotes?: string | null;
};

/** Snapshots the type-owned notes default without overwriting authored content. */
export async function materializePRTypeAuthoringDefaults(input: {
  prId: PRId;
  prNotes?: string | null;
  defaults?: PRTypeAuthoringDefaults | null;
}): Promise<void> {
  const currentNotes = input.prNotes?.trim() ?? "";
  const defaultNotes = input.defaults?.defaultNotes?.trim() ?? "";
  if (currentNotes.length === 0 && defaultNotes.length > 0) {
    await prRepo.updateNotes(input.prId, defaultNotes);
  }
}
