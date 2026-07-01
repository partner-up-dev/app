import type { BillId, BillLine } from "../../../entities/bill";
import type { UserId } from "../../../entities/user";
import { throwHttpProblem } from "../../../lib/problem-details";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { BillRepository } from "../../../repositories/BillRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import { areThereAnyUnpaidPayableBillLines } from "../services";

const billRepo = new BillRepository();
const billLineRepo = new BillLineRepository();
const tradeOrderRepo = new TradeOrderRepository();

export type ViewerBillListProjection = {
  billIds: string[];
};

export async function listViewerBills(input: {
  viewerUserId: string | null;
}): Promise<ViewerBillListProjection> {
  if (!input.viewerUserId) {
    return throwHttpProblem({ status: 401, detail: "Authentication required" });
  }

  const viewerUserId = input.viewerUserId as UserId;
  const viewerLines = await billLineRepo.listByUserId(viewerUserId);
  const viewerBillIds = Array.from(new Set(viewerLines.map((line) => line.billId)));

  if (viewerBillIds.length === 0) {
    return { billIds: [] };
  }

  const bills = await billRepo.findByIds(viewerBillIds);
  const orders = await tradeOrderRepo.listByIds(bills.map((bill) => bill.sourceOrderId));
  const linesByBillId = new Map<BillId, BillLine[]>();
  const orderById = new Map(orders.map((order) => [order.id, order]));
  for (const line of viewerLines) {
    const current = linesByBillId.get(line.billId) ?? [];
    current.push(line);
    linesByBillId.set(line.billId, current);
  }

  const billIds = bills
    .slice()
    .sort((left, right) => {
      const leftHasOutstandingCharge = areThereAnyUnpaidPayableBillLines(
        (linesByBillId.get(left.id) ?? []).map((line) => ({
          line,
          bill: left,
          order: orderById.get(left.sourceOrderId) ?? null,
        })),
      );
      const rightHasOutstandingCharge = areThereAnyUnpaidPayableBillLines(
        (linesByBillId.get(right.id) ?? []).map((line) => ({
          line,
          bill: right,
          order: orderById.get(right.sourceOrderId) ?? null,
        })),
      );

      if (leftHasOutstandingCharge !== rightHasOutstandingCharge) {
        return rightHasOutstandingCharge ? 1 : -1;
      }

      return right.createdAt.getTime() - left.createdAt.getTime();
    })
    .map((bill) => bill.id);

  return { billIds };
}
