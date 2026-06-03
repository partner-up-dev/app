import type { Bill, BillLine, BillLineKind } from "../model";

export type BillTargetDeltaDirection = "NONE" | "REFUND" | "CHARGE";

export const sumBillLineAmounts = (
  lines: BillLine[],
  kind: BillLineKind,
): number =>
  lines
    .filter((line) => line.kind === kind)
    .reduce((sum, line) => sum + line.amountFen, 0);

export const getBillChargeTotal = (bill: Bill): number =>
  sumBillLineAmounts(bill.lines, "CHARGE");

export const getBillRefundTotal = (bill: Bill): number =>
  sumBillLineAmounts(bill.lines, "REFUND");

export const deriveBillTargetDelta = (
  currentChargeTotalFen: number,
  targetChargeTotalFen: number,
): {
  direction: BillTargetDeltaDirection;
  deltaFen: number;
} => {
  if (currentChargeTotalFen === targetChargeTotalFen) {
    return {
      direction: "NONE",
      deltaFen: 0,
    };
  }

  if (currentChargeTotalFen > targetChargeTotalFen) {
    return {
      direction: "REFUND",
      deltaFen: currentChargeTotalFen - targetChargeTotalFen,
    };
  }

  return {
    direction: "CHARGE",
    deltaFen: targetChargeTotalFen - currentChargeTotalFen,
  };
};
