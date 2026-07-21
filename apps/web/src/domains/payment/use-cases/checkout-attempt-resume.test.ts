import { describe, expect, test } from "vitest";
import {
  clearPaymentCheckoutAttemptHint,
  readPaymentCheckoutAttemptHint,
  rememberPaymentCheckoutAttemptHint,
  type SessionStorageLike,
} from "./checkout-attempt-resume";
import { resolveCheckoutReconciliationDecision } from "./checkout-reconciliation-state";

const buildStorage = (): SessionStorageLike & { snapshot(): Record<string, string> } => {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
    snapshot: () => Object.fromEntries(values),
  };
};

describe("payment checkout attempt resume hint", () => {
  test("keeps a PaymentTx lookup scoped to its bill line", () => {
    const storage = buildStorage();
    rememberPaymentCheckoutAttemptHint({
      billLineId: "bill-line-a",
      paymentTxId: "ptx1_a",
      storage,
    });

    expect(readPaymentCheckoutAttemptHint({ billLineId: "bill-line-a", storage })).toEqual({
      billLineId: "bill-line-a",
      paymentTxId: "ptx1_a",
    });
    expect(readPaymentCheckoutAttemptHint({ billLineId: "bill-line-b", storage })).toBeNull();

    clearPaymentCheckoutAttemptHint({ billLineId: "bill-line-a", storage });
    expect(storage.snapshot()).toEqual({});
  });

  test("drops malformed hints instead of trusting them", () => {
    const storage = buildStorage();
    storage.setItem("partner-up:payment-checkout-attempt:v1:bill-line-a", "not-json");

    expect(readPaymentCheckoutAttemptHint({ billLineId: "bill-line-a", storage })).toBeNull();
    expect(storage.snapshot()).toEqual({});
  });

  test("drops hints whose bill line does not match the storage key", () => {
    const storage = buildStorage();
    storage.setItem(
      "partner-up:payment-checkout-attempt:v1:bill-line-a",
      JSON.stringify({ billLineId: "bill-line-b", paymentTxId: "ptx1_b" }),
    );

    expect(readPaymentCheckoutAttemptHint({ billLineId: "bill-line-a", storage })).toBeNull();
    expect(storage.snapshot()).toEqual({});
  });
});

describe("payment checkout reconciliation state", () => {
  test("continues only non-terminal backend attempts", () => {
    expect(resolveCheckoutReconciliationDecision("ACTION_REQUIRED")).toBe("CONTINUE_RECONCILING");
    expect(resolveCheckoutReconciliationDecision("PROCESSING")).toBe("CONTINUE_RECONCILING");
  });

  test("returns only confirmed success and retries terminal failures", () => {
    expect(resolveCheckoutReconciliationDecision("SUCCEEDED")).toBe("RETURN_TO_BILL");
    expect(resolveCheckoutReconciliationDecision("FAILED")).toBe("RETRY_PAYMENT");
    expect(resolveCheckoutReconciliationDecision("CLOSED")).toBe("RETRY_PAYMENT");
  });
});
