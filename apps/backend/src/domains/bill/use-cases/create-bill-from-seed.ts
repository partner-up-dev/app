import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { BillRepository } from "../../../repositories/BillRepository";
import { db } from "../../../lib/db";
import type { NewBill, NewBillLine } from "../../../entities/bill";
import type { UserId } from "../../../entities/user";
import type { RepositoryExecutor } from "../../../repositories/_executor";
import type { BillSeed } from "../model";

export async function createBillFromSeed(
  seed: BillSeed,
  executor: RepositoryExecutor = db,
): Promise<{
  billId: string;
}> {
  if (executor === db) {
    return db.transaction(async (tx) => createBillFromSeed(seed, tx));
  }

  const billRepo = new BillRepository(executor);
  const billLineRepo = new BillLineRepository(executor);
  const autoSettledAt = new Date();

  const bill = await billRepo.create({
    sourceOrderId: seed.sourceOrderId as NewBill["sourceOrderId"],
    currency: seed.currency,
  });

  await billLineRepo.createMany(
    seed.chargeLines.map(
      (line) =>
        ({
          billId: bill.id,
          userId: line.userId as UserId,
          kind: "CHARGE",
          amountFen: line.amountFen,
          currency: seed.currency,
          label: line.label,
          description: line.description ?? null,
          settledAt: line.amountFen <= 0 ? autoSettledAt : null,
        }) satisfies NewBillLine,
    ),
  );

  return {
    billId: bill.id,
  };
}
