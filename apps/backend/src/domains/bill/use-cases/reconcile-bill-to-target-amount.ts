import { throwHttpProblem } from "../../../lib/problem-details";
import { db } from "../../../lib/db";
import type { NewBillLine } from "../../../entities/bill";
import type { TradeOrderId } from "../../../entities/trade-order";
import type { UserId } from "../../../entities/user";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { BillRepository } from "../../../repositories/BillRepository";
import type { RepositoryExecutor } from "../../../repositories/_executor";
import type { BillTargetAmountSeed } from "../../trade";
import { deriveBillReconcilePlan } from "../services";

export async function reconcileBillToTargetAmount(
  seed: BillTargetAmountSeed,
  executor: RepositoryExecutor = db,
): Promise<{
  billId: string;
  direction: "NONE" | "REFUND" | "CHARGE";
  deltaFen: number;
  createdLineCount: number;
}> {
  if (executor === db) {
    return db.transaction(async (tx) => reconcileBillToTargetAmount(seed, tx));
  }

  const billRepo = new BillRepository(executor);
  const billLineRepo = new BillLineRepository(executor);

  const bill = await billRepo.findBySourceOrderId(seed.sourceOrderId as TradeOrderId);
  if (!bill) {
    return throwHttpProblem({ status: 404, detail: "Bill not found for target reconciliation" });
  }

  const lines = await billLineRepo.listByBillId(bill.id);
  const plan = deriveBillReconcilePlan({
    lines: lines.map((line) => ({
      id: line.id,
      userId: line.userId,
      kind: line.kind,
      amountFen: line.amountFen,
      label: line.label,
      description: line.description,
      sourceLineId: line.sourceLineId,
    })),
    targetChargeTotalFen: seed.targetChargeTotalFen,
  });

  if (plan.direction === "NONE") {
    return {
      billId: bill.id,
      direction: plan.direction,
      deltaFen: 0,
      createdLineCount: 0,
    };
  }

  const newLines = plan.allocations.map(
    (allocation) =>
      ({
        billId: bill.id,
        userId: allocation.userId as UserId,
        kind: plan.direction === "REFUND" ? "REFUND" : "CHARGE",
        amountFen: allocation.amountFen,
        currency: seed.currency,
        label:
          plan.direction === "REFUND"
            ? "Rental termination refund"
            : "Rental termination adjustment",
        description: `Termination attempt ${seed.sourceAttemptId} reconciliation`,
      }) satisfies NewBillLine,
  );

  const created = await billLineRepo.createMany(newLines);

  return {
    billId: bill.id,
    direction: plan.direction,
    deltaFen: plan.deltaFen,
    createdLineCount: created.length,
  };
}
