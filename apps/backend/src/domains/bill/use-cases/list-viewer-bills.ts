import type { BillId, BillLine } from "../../../entities/bill";
import type { UserId } from "../../../entities/user";
import { throwHttpProblem } from "../../../lib/problem-details";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { BillRepository } from "../../../repositories/BillRepository";

const billRepo = new BillRepository();
const billLineRepo = new BillLineRepository();

export type ViewerBillListProjection = {
  billIds: string[];
};

const hasOutstandingViewerCharge = (lines: BillLine[]): boolean =>
  lines.some((line) => line.kind === "CHARGE" && line.settledAt === null);

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
  const linesByBillId = new Map<BillId, BillLine[]>();
  for (const line of viewerLines) {
    const current = linesByBillId.get(line.billId) ?? [];
    current.push(line);
    linesByBillId.set(line.billId, current);
  }

  const billIds = bills
    .slice()
    .sort((left, right) => {
      const leftHasOutstandingCharge = hasOutstandingViewerCharge(
        linesByBillId.get(left.id) ?? [],
      );
      const rightHasOutstandingCharge = hasOutstandingViewerCharge(
        linesByBillId.get(right.id) ?? [],
      );

      if (leftHasOutstandingCharge !== rightHasOutstandingCharge) {
        return rightHasOutstandingCharge ? 1 : -1;
      }

      return right.createdAt.getTime() - left.createdAt.getTime();
    })
    .map((bill) => bill.id);

  return { billIds };
}
