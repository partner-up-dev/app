import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { readPartnerRequestsByCreatorId } from "../services/pr-read.service";

export type MyPRListItem = {
  id: PRId;
};

export async function getMyCreatedPRs(userId: UserId): Promise<MyPRListItem[]> {
  const rows = await readPartnerRequestsByCreatorId(userId, {
    consistency: "strong",
  });
  return rows.map((row) => ({ id: row.id }));
}
