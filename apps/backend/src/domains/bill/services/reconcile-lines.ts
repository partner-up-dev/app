import type { BillLine, BillLineSettlementProjection } from "../model";
import { deriveBillTargetDelta, getBillChargeTotal, getBillRefundTotal } from "./bill-totals";

type ReconcileAllocation = {
  userId: string;
  amountFen: number;
  refundOfBillLineId?: string | null;
};

function groupChargeTotalsByUser(lines: BillLine[]): ReconcileAllocation[] {
  const totals = new Map<string, number>();
  for (const line of lines) {
    if (line.kind !== "CHARGE") continue;
    totals.set(line.userId, (totals.get(line.userId) ?? 0) + line.amountFen);
  }

  return Array.from(totals.entries())
    .map(([userId, amountFen]) => ({ userId, amountFen }))
    .sort((left, right) => left.userId.localeCompare(right.userId));
}

function groupPaidChargeBasis(
  lines: BillLine[],
  settlements: BillLineSettlementProjection[],
): ReconcileAllocation[] {
  const settlementByLineId = new Map(
    settlements.map((settlement) => [settlement.billLineId, settlement]),
  );
  const refundTotalsByChargeLineId = new Map<string, number>();
  for (const line of lines) {
    if (line.kind !== "REFUND" || !line.refundOfBillLineId) continue;
    refundTotalsByChargeLineId.set(
      line.refundOfBillLineId,
      (refundTotalsByChargeLineId.get(line.refundOfBillLineId) ?? 0) + line.amountFen,
    );
  }

  return lines
    .filter((line) => line.kind === "CHARGE")
    .map((line) => {
      const paidFen = Math.min(settlementByLineId.get(line.id)?.paidFen ?? 0, line.amountFen);
      return {
        userId: line.userId,
        amountFen: Math.max(0, paidFen - (refundTotalsByChargeLineId.get(line.id) ?? 0)),
        refundOfBillLineId: line.id,
      };
    })
    .filter((share) => share.amountFen > 0)
    .sort((left, right) => {
      const userOrder = left.userId.localeCompare(right.userId);
      if (userOrder !== 0) return userOrder;
      return (left.refundOfBillLineId ?? "").localeCompare(right.refundOfBillLineId ?? "");
    });
}

function allocateByBaseShares(
  baseShares: ReconcileAllocation[],
  deltaFen: number,
): ReconcileAllocation[] {
  if (deltaFen < 0) {
    throw new Error("Reconcile delta must not be negative");
  }

  if (baseShares.length === 0) {
    throw new Error("Bill requires at least one charge line before reconciliation");
  }

  const totalBaseFen = baseShares.reduce((sum, share) => sum + share.amountFen, 0);
  if (totalBaseFen <= 0) {
    throw new Error("Bill charge base must be positive before reconciliation");
  }

  const provisional = baseShares.map((share) => {
    const raw = deltaFen * share.amountFen;
    const amountFen = Math.floor(raw / totalBaseFen);
    const remainder = raw % totalBaseFen;
    return {
      userId: share.userId,
      amountFen,
      refundOfBillLineId: share.refundOfBillLineId,
      remainder,
    };
  });

  let remainderFen = deltaFen - provisional.reduce((sum, share) => sum + share.amountFen, 0);

  provisional.sort((left, right) => {
    if (right.remainder !== left.remainder) {
      return right.remainder - left.remainder;
    }
    return left.userId.localeCompare(right.userId);
  });

  for (let index = 0; index < provisional.length && remainderFen > 0; index += 1) {
    provisional[index]!.amountFen += 1;
    remainderFen -= 1;
  }

  return provisional
    .map(({ userId, amountFen, refundOfBillLineId }) => ({
      userId,
      amountFen,
      refundOfBillLineId,
    }))
    .filter((share) => share.amountFen > 0)
    .sort((left, right) => {
      const userOrder = left.userId.localeCompare(right.userId);
      if (userOrder !== 0) return userOrder;
      return (left.refundOfBillLineId ?? "").localeCompare(right.refundOfBillLineId ?? "");
    });
}

export function deriveBillReconcilePlan(input: {
  lines: BillLine[];
  targetChargeTotalFen: number;
  lineSettlements: BillLineSettlementProjection[];
}): {
  direction: "NONE" | "REFUND" | "CHARGE";
  deltaFen: number;
  allocations: ReconcileAllocation[];
} {
  const currentEffectiveTotalFen =
    getBillChargeTotal({ id: "bill", status: "ACTIVE", currency: "CNY", lines: input.lines }) -
    getBillRefundTotal({ id: "bill", status: "ACTIVE", currency: "CNY", lines: input.lines });

  const delta = deriveBillTargetDelta(currentEffectiveTotalFen, input.targetChargeTotalFen);

  if (delta.direction === "NONE") {
    return {
      direction: "NONE",
      deltaFen: 0,
      allocations: [],
    };
  }

  if (delta.direction === "REFUND") {
    const paidChargeBasis = groupPaidChargeBasis(input.lines, input.lineSettlements);
    const paidChargeTotalFen = paidChargeBasis.reduce((sum, share) => sum + share.amountFen, 0);
    const unattributedRefundTotalFen = getBillRefundTotal({
      id: "bill",
      status: "ACTIVE",
      currency: "CNY",
      lines: input.lines.filter((line) => !line.refundOfBillLineId),
    });
    const boundedDeltaFen = Math.min(
      delta.deltaFen,
      Math.max(0, paidChargeTotalFen - unattributedRefundTotalFen),
    );

    if (boundedDeltaFen === 0) {
      return {
        direction: "NONE",
        deltaFen: 0,
        allocations: [],
      };
    }

    return {
      direction: "REFUND",
      deltaFen: boundedDeltaFen,
      allocations: allocateByBaseShares(paidChargeBasis, boundedDeltaFen),
    };
  }

  return {
    direction: delta.direction,
    deltaFen: delta.deltaFen,
    allocations: allocateByBaseShares(groupChargeTotalsByUser(input.lines), delta.deltaFen),
  };
}
