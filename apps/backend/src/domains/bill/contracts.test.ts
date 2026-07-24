import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  areThereAnyUnpaidPayableBillLines,
  deriveBillPaymentState,
  type BillPaymentStateLineFact,
  type UnpaidPayableBillLineCandidate,
} from "./contracts";

const line: BillPaymentStateLineFact = {
  id: "line-1",
  kind: "CHARGE",
  amountFen: 1200,
  paymentProviderInstanceId: null,
  settledAt: null,
};

describe("Bill contracts", () => {
  it("exposes payment-state and payable rules over value facts", () => {
    const paymentState = deriveBillPaymentState({ lines: [line] });
    const candidate: UnpaidPayableBillLineCandidate = {
      line,
      bill: { status: "ACTIVE" },
      order: {
        status: "OPEN",
        timeout: { unpaidExpiresAt: "2030-01-01T01:00:00.000Z" },
      },
    };

    assert.equal(paymentState.allChargesPaid, false);
    assert.equal(
      areThereAnyUnpaidPayableBillLines([candidate], new Date("2030-01-01T00:30:00.000Z")),
      true,
    );
  });
});
