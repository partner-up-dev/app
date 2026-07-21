/**
 * Stable problem code for a PR-owned admission conflict. Consumers may use it
 * to distinguish a concurrent same-key replay from a different-key PR/Offer
 * conflict without depending on the attachment implementation.
 */
export const PR_ACTIVE_ORDER_EXISTS_CODE = "PR_ACTIVE_ORDER_EXISTS";
