import type { BillId, BillLine, BillLineId } from "../../../entities/bill";
import type { TradeOrder } from "../../../entities/trade-order";
import type { UserId } from "../../../entities/user";
import { throwHttpProblem } from "../../../lib/problem-details";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { BillRepository } from "../../../repositories/BillRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import type { BillLineSettlementStatus } from "../model";
import { deriveBillPaymentState, isBillLinePayable, isOrderUnpaidWindowOpen } from "../services";

const billRepo = new BillRepository();
const billLineRepo = new BillLineRepository();
const tradeOrderRepo = new TradeOrderRepository();

export type BillLineCheckoutTargetProjection = {
  bill: {
    id: string;
    sourceOrderId: string;
    status: string;
    currency: "CNY";
  };
  order: {
    id: string;
    family: TradeOrder["family"];
    status: TradeOrder["status"];
  };
  line: {
    id: string;
    billId: string;
    userId: string;
    kind: BillLine["kind"];
    amountFen: number;
    currency: "CNY";
    label: string;
    description: string | null;
    settlementStatus: BillLineSettlementStatus;
    paymentProviderInstanceId: string | null;
    attemptCount: number;
    settledAt: string | null;
  };
  eligibility: {
    payable: boolean;
    disabledReason: string | null;
  };
};

const canViewOrder = (order: TradeOrder, userId: string): boolean =>
  order.createdBy === userId ||
  order.participants.some((participant) => participant.userId === userId);

export async function resolveBillLineCheckoutBasis(input: {
  billLineId: BillLineId;
  viewerUserId: UserId;
}): Promise<{
  line: BillLine;
  bill: NonNullable<Awaited<ReturnType<BillRepository["findById"]>>>;
  order: TradeOrder;
  settlementStatus: BillLineSettlementStatus;
  disabledReason: string | null;
}> {
  const line = await billLineRepo.findById(input.billLineId);
  if (!line) {
    return throwHttpProblem({ status: 404, detail: "BillLine not found" });
  }

  const bill = await billRepo.findById(line.billId as BillId);
  if (!bill) {
    return throwHttpProblem({ status: 404, detail: "Bill not found" });
  }

  const order = await tradeOrderRepo.findById(bill.sourceOrderId);
  if (!order) {
    return throwHttpProblem({ status: 404, detail: "Order not found for BillLine" });
  }

  if (!canViewOrder(order, input.viewerUserId)) {
    return throwHttpProblem({ status: 403, detail: "Payment checkout is not accessible" });
  }

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
              : !isOrderUnpaidWindowOpen(order.timeout.unpaidExpiresAt)
                ? "订单支付窗口已过期"
                : null;

  return {
    line,
    bill,
    order,
    settlementStatus,
    disabledReason,
  };
}

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
          order: basis.order,
        }),
      disabledReason: basis.disabledReason,
    },
  };
}
