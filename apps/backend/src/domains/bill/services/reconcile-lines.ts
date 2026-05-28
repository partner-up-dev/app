import type { BillLine } from "../model";
import { deriveBillTargetDelta, getBillChargeTotal, getBillRefundTotal } from "./bill-totals";

type ReconcileAllocation = {
  userId: string;
  amountFen: number;
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
      remainder,
    };
  });

  let remainderFen =
    deltaFen - provisional.reduce((sum, share) => sum + share.amountFen, 0);

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
    .map(({ userId, amountFen }) => ({ userId, amountFen }))
    .filter((share) => share.amountFen > 0)
    .sort((left, right) => left.userId.localeCompare(right.userId));
}

export function deriveBillReconcilePlan(input: {
  lines: BillLine[];
  targetChargeTotalFen: number;
}): {
  direction: "NONE" | "REFUND" | "CHARGE";
  deltaFen: number;
  allocations: ReconcileAllocation[];
} {
  const currentEffectiveTotalFen =
    getBillChargeTotal({ id: "bill", status: "ACTIVE", currency: "CNY", lines: input.lines }) -
    getBillRefundTotal({ id: "bill", status: "ACTIVE", currency: "CNY", lines: input.lines });

  const delta = deriveBillTargetDelta(
    currentEffectiveTotalFen,
    input.targetChargeTotalFen,
  );

  if (delta.direction === "NONE") {
    return {
      direction: "NONE",
      deltaFen: 0,
      allocations: [],
    };
  }

  return {
    direction: delta.direction,
    deltaFen: delta.deltaFen,
    allocations: allocateByBaseShares(
      groupChargeTotalsByUser(input.lines),
      delta.deltaFen,
    ),
  };
}
