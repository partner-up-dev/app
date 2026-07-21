export type CheckoutPaymentTxStatus =
  | "ACTION_REQUIRED"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CLOSED";

export type CheckoutReconciliationDecision =
  | "CONTINUE_RECONCILING"
  | "RETURN_TO_BILL"
  | "RETRY_PAYMENT";

/**
 * A client callback cannot decide this transition. It only prompts Checkout
 * to ask the backend for a PaymentTx projection, whose status is reduced here.
 */
export const resolveCheckoutReconciliationDecision = (
  status: CheckoutPaymentTxStatus,
): CheckoutReconciliationDecision => {
  if (status === "SUCCEEDED") return "RETURN_TO_BILL";
  if (status === "FAILED" || status === "CLOSED") return "RETRY_PAYMENT";
  return "CONTINUE_RECONCILING";
};
