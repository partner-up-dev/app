import type { BillId, BillLine } from "../../../entities/bill";
import type { TradeOrder, TradeOrderId } from "../../../entities/trade-order";
import type { UserId } from "../../../entities/user";
import { throwHttpProblem } from "../../../lib/problem-details";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { BillRepository } from "../../../repositories/BillRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import { UserRepository } from "../../../repositories/UserRepository";
import { getOrderItemSkuName } from "../../trade";
import { deriveBillPaymentState } from "../services";

const billRepo = new BillRepository();
const billLineRepo = new BillLineRepository();
const tradeOrderRepo = new TradeOrderRepository();
const userRepo = new UserRepository();

export type BillDetailProjection = {
  bill: {
    id: string;
    sourceOrderId: string;
    status: string;
    currency: "CNY";
    totalAmountFen: number;
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
    payer: {
      userId: string;
      nickname: string | null;
      displayName: string;
      avatarUrl: string | null;
      isViewer: boolean;
    };
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

const resolvePayerDisplayName = (input: { nickname: string | null; isViewer: boolean }): string => {
  const normalizedNickname = input.nickname?.trim() ?? "";
  if (normalizedNickname.length > 0) return normalizedNickname;
  return input.isViewer ? "你" : "参与者";
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
  const paymentByLineId = new Map(paymentState.lines.map((line) => [line.billLineId, line]));
  const payers = await userRepo.findByIds(lines.map((line) => line.userId));
  const payerByUserId = new Map(payers.map((payer) => [payer.id, payer]));

  return {
    bill: {
      id: bill.id,
      sourceOrderId: bill.sourceOrderId,
      status: bill.status,
      currency: bill.currency,
      totalAmountFen: paymentState.chargeTotalFen - paymentState.refundTotalFen,
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
      const payer = payerByUserId.get(line.userId);
      const isViewer = line.userId === input.viewerUserId;

      return {
        id: line.id,
        userId: line.userId,
        payer: {
          userId: line.userId,
          nickname: payer?.nickname ?? null,
          displayName: resolvePayerDisplayName({
            nickname: payer?.nickname ?? null,
            isViewer,
          }),
          avatarUrl: payer?.avatar ?? null,
          isViewer,
        },
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
        checkoutHref: payableByViewer ? `/bill-lines/${line.id}/checkout` : null,
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
