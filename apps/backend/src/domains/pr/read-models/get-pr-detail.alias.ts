import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { getPRDetailView, type PRDetail } from "./get-pr-detail";

export type PRDetailAlias = PRDetail;

export async function getPRDetailAlias(
  id: PRId,
  viewerIdentity?: {
    userId?: UserId | null;
    openId?: string | null;
  },
): Promise<PRDetailAlias> {
  return getPRDetailView(id, viewerIdentity);
}
