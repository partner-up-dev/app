import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { readPartnerRequestsByIds } from "../services/pr-read.service";

const partnerRepo = new PartnerRepository();

export type MyPRListItem = {
  id: PRId;
};

export async function getMyJoinedPRs(userId: UserId): Promise<MyPRListItem[]> {
  const slots = await partnerRepo.findActiveByUserId(userId);
  const uniquePrIds = Array.from(new Set(slots.map((slot) => slot.prId)));
  const rows = await readPartnerRequestsByIds(uniquePrIds, {
    consistency: "strong",
  });
  return rows
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .filter((row) => row.status !== "DRAFT")
    .map((row) => ({ id: row.id }));
}
