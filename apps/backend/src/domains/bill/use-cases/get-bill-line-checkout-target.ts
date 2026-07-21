import type { BillId, BillLine, BillLineId } from "../../../entities/bill";
import type { UserId } from "../../../entities/user";
import { throwHttpProblem } from "../../../lib/problem-details";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { BillRepository } from "../../../repositories/BillRepository";
import { getTradeOrderBillingContext } from "../../trade/queries";
import type { BillLineCheckoutTargetProjection } from "../contracts";
import { deriveBillPaymentState, isBillLinePayable, isOrderUnpaidWindowOpen } from "../services";

const billRepo = new BillRepository();
const billLineRepo = new BillLineRepository();
type BillLineCheckoutBasis = {
  line: BillLine;
  bill: NonNullable<Awaited<ReturnType<BillRepository["findById"]>>>;
  order: BillLineCheckoutTargetProjection["order"];
  settlementStatus: BillLineCheckoutTargetProjection["line"]["settlementStatus"];
  disabledReason: string | null;
};

const resolveBillLineCheckoutBasis = async (input: {
  billLineId: BillLineId;
  viewerUserId: UserId;
}): Promise<BillLineCheckoutBasis> => {
  const line = await billLineRepo.findById(input.billLineId);
  if (!line) {
    return throwHttpProblem({ status: 404, detail: "BillLine not found" });
  }

  const bill = await billRepo.findById(line.billId as BillId);
  if (!bill) {
    return throwHttpProblem({ status: 404, detail: "Bill not found" });
  }

  const order = await getTradeOrderBillingContext({
    orderId: bill.sourceOrderId,
    viewerUserId: input.viewerUserId,
  });

  if (line.userId !== input.viewerUserId) {
    return throwHttpProblem({
      status: 403,
      detail: "Users can only pay their own BillLine",
    });
  }

  const paymentState = deriveBillPaymentState({ lines: [line] });
  const settlementStatus = paymentState.lines[0]?.status ?? "UNPAID";
  const disabledReason =
    bill.status !== "ACTIVE"
      ? "账单当前不可支付"
      : order.status !== "OPEN"
        ? "订单当前不可支付"
        : line.kind !== "CHARGE"
          ? "退款账单行不能由用户发起支付"
          : line.amountFen <= 0
            ? "该账单行无需支付"
            : settlementStatus === "PAID"
              ? "该账单行已支付"
              : !isOrderUnpaidWindowOpen(order.unpaidExpiresAt)
                ? "订单支付窗口已过期"
                : null;

  return {
    line,
    bill,
    order,
    settlementStatus,
    disabledReason,
  };
};

export async function getBillLineCheckoutTarget(input: {
  billLineId: string;
  viewerUserId: string | null;
}): Promise<BillLineCheckoutTargetProjection> {
  if (!input.viewerUserId) {
    return throwHttpProblem({ status: 401, detail: "Authentication required" });
  }

  const basis = await resolveBillLineCheckoutBasis({
    billLineId: input.billLineId as BillLineId,
    viewerUserId: input.viewerUserId as UserId,
  });

  return {
    bill: {
      id: basis.bill.id,
      sourceOrderId: basis.bill.sourceOrderId,
      status: basis.bill.status,
      currency: basis.bill.currency,
    },
    order: {
      id: basis.order.id,
      family: basis.order.family,
      status: basis.order.status,
      unpaidExpiresAt: basis.order.unpaidExpiresAt,
    },
    line: {
      id: basis.line.id,
      billId: basis.line.billId,
      userId: basis.line.userId,
      kind: basis.line.kind,
      amountFen: basis.line.amountFen,
      currency: basis.line.currency,
      label: basis.line.label,
      description: basis.line.description,
      settlementStatus: basis.settlementStatus,
      paymentProviderInstanceId: basis.line.paymentProviderInstanceId,
      attemptCount: basis.line.attemptCount,
      settledAt: basis.line.settledAt?.toISOString() ?? null,
    },
    eligibility: {
      payable:
        basis.disabledReason === null &&
        isBillLinePayable({
          line: basis.line,
          bill: basis.bill,
          order: {
            status: basis.order.status,
            timeout: {
              unpaidExpiresAt: basis.order.unpaidExpiresAt,
            },
          },
        }),
      disabledReason: basis.disabledReason,
    },
  };
}
