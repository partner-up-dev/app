import type { PRId } from "../../entities/partner-request";

/**
 * Stable problem code for a PR-owned admission conflict. Consumers may use it
 * to distinguish a concurrent same-key replay from a different-key PR/Offer
 * conflict without depending on the attachment implementation.
 */
export const PR_ACTIVE_ORDER_EXISTS_CODE = "PR_ACTIVE_ORDER_EXISTS";

/**
 * Actor-checked PR facts needed to resolve the legacy attached-order route.
 * Trade order rows and the PR persistence record stay inside their owners.
 */
export type PRAttachedOrderContext = {
  prId: PRId;
  orderIds: string[];
};
