import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { BillLine } from "../../../entities/bill";
import type { UnpaidPayableBillLineCandidate } from "./payable-bill-lines";
import { areThereAnyUnpaidPayableBillLines, isBillLinePayable } from "./payable-bill-lines";

const lineId = "11111111-1111-4111-8111-111111111111" as BillLine["id"];
const billId = "22222222-2222-4222-8222-222222222222" as BillLine["billId"];
const userId = "33333333-3333-4333-8333-333333333333" as BillLine["userId"];

const buildLine = (overrides: Partial<BillLine> = {}): BillLine => ({
  id: lineId,
  billId,
  userId,
  kind: "CHARGE",
  amountFen: 1200,
  currency: "CNY",
  label: "Charge",
  description: null,
  refundOfBillLineId: null,
  paymentProviderInstanceId: null,
  attemptCount: 0,
  createdAt: new Date("2030-01-01T00:00:00.000Z"),
  settledAt: null,
  ...overrides,
});

const buildCandidate = (
  overrides: Partial<UnpaidPayableBillLineCandidate> = {},
): UnpaidPayableBillLineCandidate => ({
  line: buildLine(),
  bill: {
    status: "ACTIVE",
  },
  order: {
    status: "OPEN",
    timeout: {
      unpaidExpiresAt: "2030-01-01T01:00:00.000Z",
    },
  },
  ...overrides,
});

describe("payable bill lines", () => {
  const now = new Date("2030-01-01T00:30:00.000Z");

  it("treats a positive unsettled charge inside the unpaid window as payable", () => {
    assert.equal(isBillLinePayable(buildCandidate(), now), true);
  });

  it("does not treat expired unpaid windows as payable", () => {
    assert.equal(
      isBillLinePayable(
        buildCandidate({
          order: {
            status: "OPEN",
            timeout: {
              unpaidExpiresAt: "2030-01-01T00:00:00.000Z",
            },
          },
        }),
        now,
      ),
      false,
    );
  });

  it("does not treat zero-amount charge lines as payable", () => {
    assert.equal(
      isBillLinePayable(
        buildCandidate({
          line: buildLine({
            amountFen: 0,
          }),
        }),
        now,
      ),
      false,
    );
  });

  it("detects whether any candidate still has an unpaid payable bill line", () => {
    const candidates = [
      buildCandidate({
        line: buildLine({
          amountFen: 0,
        }),
      }),
      buildCandidate(),
    ];

    assert.equal(areThereAnyUnpaidPayableBillLines(candidates, now), true);
  });
});
