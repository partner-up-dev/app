import { throwHttpProblem } from "../../../lib/problem-details";
import type { BillId, BillLine } from "../../../entities/bill";
import type { TradeOrder, TradeOrderId } from "../../../entities/trade-order";
import type { UserId } from "../../../entities/user";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { BillRepository } from "../../../repositories/BillRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import { deriveBillPaymentState } from "../services";
import { getOrderItemSkuName } from "../../trade";

const billRepo = new BillRepository();
const billLineRepo = new BillLineRepository();
const tradeOrderRepo = new TradeOrderRepository();

export type BillDetailProjection = {
  bill: {
    id: string;
    sourceOrderId: string;
    status: string;
    currency: "CNY";
    chargeTotalFen: number;
    paidChargeFen: number;
    refundTotalFen: number;
    refundedFen: number;
    settlementStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID";
  };
  order: {
    id: string;
    family: TradeOrder["family"];
    status: TradeOrder["status"];
    itemName: string;
  };
  viewer: {
    userId: string;
  };
  lines: Array<{
    id: string;
    userId: string;
    kind: BillLine["kind"];
    amountFen: number;
    currency: "CNY";
    label: string;
    description: string | null;
    refundOfBillLineId: string | null;
    settlementStatus: string;
    paidFen: number;
    refundedFen: number;
    payableByViewer: boolean;
    checkoutHref: string | null;
    paymentProviderInstanceId: string | null;
    attemptCount: number;
    settledAt: string | null;
  }>;
};

const canViewOrder = (order: TradeOrder, userId: string): boolean =>
  order.createdBy === userId ||
  order.participants.some((participant) => participant.userId === userId);

const resolveSettlementStatus = (input: {
  chargeTotalFen: number;
  paidChargeFen: number;
}): BillDetailProjection["bill"]["settlementStatus"] => {
  if (input.chargeTotalFen > 0 && input.paidChargeFen >= input.chargeTotalFen) {
    return "PAID";
  }
  if (input.paidChargeFen > 0) return "PARTIALLY_PAID";
  return "UNPAID";
};

async function buildBillDetail(input: {
  billId: BillId;
  viewerUserId: UserId;
}): Promise<BillDetailProjection> {
  const bill = await billRepo.findById(input.billId);
  if (!bill) {
    return throwHttpProblem({ status: 404, detail: "Bill not found" });
  }

  const order = await tradeOrderRepo.findById(bill.sourceOrderId);
  if (!order) {
    return throwHttpProblem({ status: 404, detail: "Order not found for Bill" });
  }
  if (!canViewOrder(order, input.viewerUserId)) {
    return throwHttpProblem({ status: 403, detail: "Bill is not accessible" });
  }

  const lines = await billLineRepo.listByBillId(bill.id);
  const paymentState = deriveBillPaymentState({ lines });
  const paymentByLineId = new Map(
    paymentState.lines.map((line) => [line.billLineId, line]),
  );

  return {
    bill: {
      id: bill.id,
      sourceOrderId: bill.sourceOrderId,
      status: bill.status,
      currency: bill.currency,
      chargeTotalFen: paymentState.chargeTotalFen,
      paidChargeFen: paymentState.paidChargeFen,
      refundTotalFen: paymentState.refundTotalFen,
      refundedFen: paymentState.refundedFen,
      settlementStatus: resolveSettlementStatus(paymentState),
    },
    order: {
      id: order.id,
      family: order.family,
      status: order.status,
      itemName: order.items[0] ? getOrderItemSkuName(order.items[0]) : "订单项目",
    },
    viewer: {
      userId: input.viewerUserId,
    },
    lines: lines.map((line) => {
      const payment = paymentByLineId.get(line.id);
      const payableByViewer =
        bill.status === "ACTIVE" &&
        order.status === "OPEN" &&
        line.kind === "CHARGE" &&
        line.userId === input.viewerUserId &&
        payment?.status !== "PAID";

      return {
        id: line.id,
        userId: line.userId,
        kind: line.kind,
        amountFen: line.amountFen,
        currency: line.currency,
        label: line.label,
        description: line.description,
        refundOfBillLineId: line.refundOfBillLineId,
        settlementStatus: payment?.status ?? "UNPAID",
        paidFen: payment?.paidFen ?? 0,
        refundedFen: payment?.refundableFen ?? 0,
        payableByViewer,
        checkoutHref: payableByViewer
          ? `/bill-lines/${line.id}/checkout`
          : null,
        paymentProviderInstanceId: line.paymentProviderInstanceId,
        attemptCount: line.attemptCount,
        settledAt: line.settledAt?.toISOString() ?? null,
      };
    }),
  };
}

export async function getBillDetail(input: {
  billId: string;
  viewerUserId: string | null;
}): Promise<BillDetailProjection> {
  if (!input.viewerUserId) {
    return throwHttpProblem({ status: 401, detail: "Authentication required" });
  }

  return buildBillDetail({
    billId: input.billId as BillId,
    viewerUserId: input.viewerUserId as UserId,
  });
}

export async function getBillDetailByOrderId(input: {
  orderId: string;
  viewerUserId: string | null;
}): Promise<BillDetailProjection> {
  if (!input.viewerUserId) {
    return throwHttpProblem({ status: 401, detail: "Authentication required" });
  }

  const bill = await billRepo.findBySourceOrderId(input.orderId as TradeOrderId);
  if (!bill) {
    return throwHttpProblem({ status: 404, detail: "Bill not found for Order" });
  }

  return buildBillDetail({
    billId: bill.id,
    viewerUserId: input.viewerUserId as UserId,
  });
}
