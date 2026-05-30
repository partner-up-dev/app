import { throwHttpProblem } from "../../../lib/problem-details";
import type { BillId, BillLine, BillLineId } from "../../../entities/bill";
import type { PaymentTx } from "../../../entities/payment";
import type { TradeOrder, TradeOrderId } from "../../../entities/trade-order";
import type { UserId } from "../../../entities/user";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { BillRepository } from "../../../repositories/BillRepository";
import { PaymentTxRepository } from "../../../repositories/PaymentTxRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import { deriveBillPaymentState } from "../services";

const billRepo = new BillRepository();
const billLineRepo = new BillLineRepository();
const paymentTxRepo = new PaymentTxRepository();
const tradeOrderRepo = new TradeOrderRepository();

type PaymentTxSummary = {
  id: string;
  type: "CHARGE" | "REFUND";
  status: string;
  amountFen: number;
  providerInstanceId: string;
  clientId: string | null;
  createdAt: string;
  updatedAt: string;
};

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
    latestPaymentTx: PaymentTxSummary | null;
    activePaymentTxId: string | null;
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

const toPaymentTxSummary = (tx: PaymentTx | null): PaymentTxSummary | null => {
  if (!tx) return null;
  return {
    id: tx.id,
    type: tx.type,
    status: tx.status,
    amountFen: tx.amountFen,
    providerInstanceId: tx.providerInstanceId,
    clientId: tx.clientId,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
  };
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
  const paymentTxs = await paymentTxRepo.listByBillLineIds(
    lines.map((line) => line.id as BillLineId),
  );
  const paymentState = deriveBillPaymentState({ lines, txs: paymentTxs });
  const paymentByLineId = new Map(
    paymentState.lines.map((line) => [line.billLineId, line]),
  );
  const latestTxByLineId = new Map<BillLineId, PaymentTx>();
  for (const tx of paymentTxs) {
    if (!latestTxByLineId.has(tx.billLineId)) {
      latestTxByLineId.set(tx.billLineId, tx);
    }
  }

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
      itemName: order.items[0]?.skuName ?? "订单项目",
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
        latestPaymentTx: toPaymentTxSummary(latestTxByLineId.get(line.id) ?? null),
        activePaymentTxId: payment?.activePaymentTxId ?? null,
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
