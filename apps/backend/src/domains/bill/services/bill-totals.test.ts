import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { Bill } from "../model";
import {
  deriveBillTargetDelta,
  getBillChargeTotal,
  getBillRefundTotal,
} from "./bill-totals";

const createBill = (): Bill => ({
  id: "bill-1",
  status: "ACTIVE",
  currency: "CNY",
  lines: [
    {
      id: "line-charge-1",
      userId: "user-1",
      kind: "CHARGE",
      amountFen: 800,
      label: "场地预订费用",
      description: "按订单分摊规则生成",
    },
    {
      id: "line-charge-2",
      userId: "user-2",
      kind: "CHARGE",
      amountFen: 1200,
      label: "场地预订费用",
      description: "按订单分摊规则生成",
    },
    {
      id: "line-refund-1",
      userId: "user-1",
      kind: "REFUND",
      amountFen: 300,
      label: "取消退款",
      description: "订单终止后收敛到账单目标总额",
    },
  ],
});

describe("bill totals", () => {
  it("derives charge and refund totals separately", () => {
    const bill = createBill();

    assert.equal(getBillChargeTotal(bill), 2000);
    assert.equal(getBillRefundTotal(bill), 300);
  });

  it("derives refund delta when current total exceeds target", () => {
    assert.deepEqual(deriveBillTargetDelta(2000, 800), {
      direction: "REFUND",
      deltaFen: 1200,
    });
  });

  it("derives charge delta when target exceeds current total", () => {
    assert.deepEqual(deriveBillTargetDelta(800, 2000), {
      direction: "CHARGE",
      deltaFen: 1200,
    });
  });
});
