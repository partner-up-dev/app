import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import type { PRDraftActor } from "../services/draft-access-policy.service";
import { getPRDetailView, type PRDetail } from "./get-pr-detail";

export type PRDetailAlias = PRDetail;

export async function getPRDetailAlias(
  id: PRId,
  viewerIdentity?: {
    userId?: UserId | null;
    openId?: string | null;
    roles?: PRDraftActor["roles"];
  },
): Promise<PRDetailAlias> {
  return getPRDetailView(id, viewerIdentity);
}
