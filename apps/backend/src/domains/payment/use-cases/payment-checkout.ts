import { randomUUID } from "node:crypto";
import { throwHttpProblem } from "../../../lib/problem-details";
import type { BillId, BillLine, BillLineId } from "../../../entities/bill";
import type {
  PaymentProviderInstance,
  PaymentTx,
  PaymentTxId,
} from "../../../entities/payment";
import type { TradeOrder } from "../../../entities/trade-order";
import type { UserId } from "../../../entities/user";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { BillRepository } from "../../../repositories/BillRepository";
import { PaymentProviderInstanceRepository } from "../../../repositories/PaymentProviderInstanceRepository";
import { PaymentTxRepository } from "../../../repositories/PaymentTxRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import { UserRepository } from "../../../repositories/UserRepository";
import { getOrderItemSkuName } from "../../trade";
import {
  createPaymentProviderPort,
  deriveBillPaymentState,
  ensureWeChatPayPlatformCertificates,
  resolveWeChatPayChargeNotifyUrl,
} from "../services";
import { applyPaymentSettlementConsequence } from "./payment-settlement-consequence";

const billRepo = new BillRepository();
const billLineRepo = new BillLineRepository();
const paymentTxRepo = new PaymentTxRepository();
const providerInstanceRepo = new PaymentProviderInstanceRepository();
const tradeOrderRepo = new TradeOrderRepository();
const userRepo = new UserRepository();

export type PaymentCheckoutProjection = {
  billLine: {
    id: string;
    billId: string;
    userId: string;
    kind: BillLine["kind"];
    amountFen: number;
    currency: "CNY";
    label: string;
    description: string | null;
  };
  bill: {
    id: string;
    sourceOrderId: string;
  };
  order: {
    id: string;
    family: TradeOrder["family"];
    status: TradeOrder["status"];
    itemName: string;
  };
  eligibility: {
    payable: boolean;
    disabledReason: string | null;
  };
  payment: PaymentTxProjection | null;
};

export type PaymentTxProjection = {
  id: string;
  billLineId: string;
  type: "CHARGE" | "REFUND";
  status: string;
  amountFen: number;
  currency: "CNY";
  clientId: string | null;
  providerInstanceId: string;
  providerStatus: string | null;
  clientAction: unknown;
  expiresAt: string | null;
  succeededAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const toPaymentTxProjection = (tx: PaymentTx): PaymentTxProjection => ({
  id: tx.id,
  billLineId: tx.billLineId,
  type: tx.type,
  status: tx.status,
  amountFen: tx.amountFen,
  currency: tx.currency,
  clientId: tx.clientId,
  providerInstanceId: tx.providerInstanceId,
  providerStatus: tx.providerStatus,
  clientAction: tx.clientAction,
  expiresAt: tx.expiresAt?.toISOString() ?? null,
  succeededAt: tx.succeededAt?.toISOString() ?? null,
  createdAt: tx.createdAt.toISOString(),
  updatedAt: tx.updatedAt.toISOString(),
});

const canViewOrder = (order: TradeOrder, userId: string): boolean =>
  order.createdBy === userId ||
  order.participants.some((participant) => participant.userId === userId);

const buildMerchantOrderNo = (paymentTxId: string): string =>
  `PU${paymentTxId.replaceAll("-", "").slice(0, 30)}`;

async function resolveCheckoutBasis(input: {
  billLineId: BillLineId;
  viewerUserId: UserId;
}): Promise<{
  line: BillLine;
  bill: NonNullable<Awaited<ReturnType<BillRepository["findById"]>>>;
  order: TradeOrder;
  latestPayment: PaymentTx | null;
  activePayment: PaymentTx | null;
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

  const txs = await paymentTxRepo.listByBillLineIds([line.id]);
  const paymentState = deriveBillPaymentState({ lines: [line], txs });
  const lineState = paymentState.lines[0];
  const activePayment = await paymentTxRepo.findActiveByBillLine({
    billLineId: line.id,
    type: "CHARGE",
  });
  const latestPayment = await paymentTxRepo.findLatestByBillLine({
    billLineId: line.id,
    type: "CHARGE",
  });

  const disabledReason =
    bill.status !== "ACTIVE"
      ? "账单当前不可支付"
      : order.status !== "OPEN"
        ? "订单当前不可支付"
        : line.kind !== "CHARGE"
          ? "退款账单行不能由用户发起支付"
          : lineState?.status === "PAID"
            ? "该账单行已支付"
            : null;

  return {
    line,
    bill,
    order,
    latestPayment,
    activePayment,
    disabledReason,
  };
}

const buildCheckoutProjection = (input: {
  line: BillLine;
  bill: NonNullable<Awaited<ReturnType<BillRepository["findById"]>>>;
  order: TradeOrder;
  payment: PaymentTx | null;
  disabledReason: string | null;
}): PaymentCheckoutProjection => ({
  billLine: {
    id: input.line.id,
    billId: input.line.billId,
    userId: input.line.userId,
    kind: input.line.kind,
    amountFen: input.line.amountFen,
    currency: input.line.currency,
    label: input.line.label,
    description: input.line.description,
  },
  bill: {
    id: input.bill.id,
    sourceOrderId: input.bill.sourceOrderId,
  },
  order: {
    id: input.order.id,
    family: input.order.family,
    status: input.order.status,
    itemName: input.order.items[0]
      ? getOrderItemSkuName(input.order.items[0])
      : "订单项目",
  },
  eligibility: {
    payable: input.disabledReason === null,
    disabledReason: input.disabledReason,
  },
  payment: input.payment ? toPaymentTxProjection(input.payment) : null,
});

async function resolveProviderForClient(input: {
  clientId: string;
}): Promise<{
  providerInstance: PaymentProviderInstance;
}> {
  const providerInstance = await providerInstanceRepo.findActiveByClientId(
    input.clientId,
  );
  if (!providerInstance) {
    return throwHttpProblem({
      status: 409,
      detail: `No active payment provider instance for client ${input.clientId}`,
    });
  }

  return {
    providerInstance: await ensureWeChatPayPlatformCertificates(providerInstance),
  };
}

export async function getPaymentCheckout(input: {
  billLineId: string;
  viewerUserId: string | null;
}): Promise<PaymentCheckoutProjection> {
  if (!input.viewerUserId) {
    return throwHttpProblem({ status: 401, detail: "Authentication required" });
  }

  const basis = await resolveCheckoutBasis({
    billLineId: input.billLineId as BillLineId,
    viewerUserId: input.viewerUserId as UserId,
  });

  return buildCheckoutProjection({
    line: basis.line,
    bill: basis.bill,
    order: basis.order,
    payment: basis.activePayment ?? basis.latestPayment,
    disabledReason: basis.disabledReason,
  });
}

export async function createOrReuseChargeForBillLine(input: {
  billLineId: string;
  viewerUserId: string | null;
  clientId: string;
}): Promise<PaymentCheckoutProjection> {
  if (!input.viewerUserId) {
    return throwHttpProblem({ status: 401, detail: "Authentication required" });
  }

  const basis = await resolveCheckoutBasis({
    billLineId: input.billLineId as BillLineId,
    viewerUserId: input.viewerUserId as UserId,
  });
  if (basis.disabledReason) {
    return throwHttpProblem({ status: 409, detail: basis.disabledReason });
  }
  if (basis.activePayment) {
    return buildCheckoutProjection({
      line: basis.line,
      bill: basis.bill,
      order: basis.order,
      payment: basis.activePayment,
      disabledReason: null,
    });
  }

  const provider = await resolveProviderForClient({ clientId: input.clientId });
  const port = createPaymentProviderPort({
    providerInstance: provider.providerInstance,
  });
  const user = await userRepo.findById(input.viewerUserId as UserId);
  const requiresOpenId = provider.providerInstance.config.chargeMode === "JSAPI";
  if (requiresOpenId && !user?.openId) {
    return throwHttpProblem({
      status: 409,
      detail: "WeChatPay charge requires a bound WeChat openid",
    });
  }

  const paymentTxId = randomUUID() as PaymentTxId;
  const merchantOrderNo = buildMerchantOrderNo(paymentTxId);
  const expiresAt = new Date(basis.order.timeout.unpaidExpiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    return throwHttpProblem({
      status: 409,
      detail: "Order unpaid window has expired",
    });
  }

  const created = await paymentTxRepo.create({
    id: paymentTxId,
    billLineId: basis.line.id,
    type: "CHARGE",
    providerInstanceId: provider.providerInstance.id,
    clientId: input.clientId,
    status: "INITIATED",
    amountFen: basis.line.amountFen,
    currency: basis.line.currency,
    requestedBy: input.viewerUserId as UserId,
    merchantOrderNo,
    expiresAt,
  });

  const prepay = await port.createChargePrepay({
    providerInstanceId: provider.providerInstance.id,
    merchantOrderNo,
    amountFen: basis.line.amountFen,
    currency: basis.line.currency,
    description: basis.line.label,
    payerOpenId: user?.openId ?? null,
    notifyUrl: resolveWeChatPayChargeNotifyUrl(provider.providerInstance),
    expiresAt,
  });

  const updated = await paymentTxRepo.updateProviderStart({
    id: created.id,
    status: "ACTION_REQUIRED",
    providerPrepayId: prepay.providerPrepayId,
    providerStatus: prepay.providerStatus,
    clientAction: prepay.clientAction,
    providerSnapshot: prepay.providerSnapshot,
  });

  return buildCheckoutProjection({
    line: basis.line,
    bill: basis.bill,
    order: basis.order,
    payment: updated ?? created,
    disabledReason: null,
  });
}

const mapNormalizedStatusToTxStatus = (
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "CLOSED",
): PaymentTx["status"] => {
  if (status === "SUCCEEDED") return "SUCCEEDED";
  if (status === "FAILED") return "FAILED";
  if (status === "CLOSED") return "CLOSED";
  return "PROCESSING";
};

export async function syncPaymentTx(input: {
  paymentTxId: string;
  viewerUserId: string | null;
}): Promise<PaymentTxProjection> {
  if (!input.viewerUserId) {
    return throwHttpProblem({ status: 401, detail: "Authentication required" });
  }

  const tx = await paymentTxRepo.findById(input.paymentTxId as PaymentTxId);
  if (!tx) {
    return throwHttpProblem({ status: 404, detail: "PaymentTx not found" });
  }
  if (tx.type !== "CHARGE") {
    return throwHttpProblem({
      status: 409,
      detail: "Only charge PaymentTx can be synced from checkout",
    });
  }

  const basis = await resolveCheckoutBasis({
    billLineId: tx.billLineId,
    viewerUserId: input.viewerUserId as UserId,
  });
  if (!canViewOrder(basis.order, input.viewerUserId)) {
    return throwHttpProblem({ status: 403, detail: "PaymentTx is not accessible" });
  }
  if (tx.status === "SUCCEEDED") {
    await applyPaymentSettlementConsequence({ paymentTxId: tx.id });
    return toPaymentTxProjection(tx);
  }
  if (tx.status === "FAILED" || tx.status === "CLOSED") {
    return toPaymentTxProjection(tx);
  }
  if (!tx.merchantOrderNo) {
    return throwHttpProblem({
      status: 409,
      detail: "PaymentTx has no provider merchant order number",
    });
  }

  const providerInstance = await providerInstanceRepo.findById(tx.providerInstanceId);
  if (!providerInstance) {
    return throwHttpProblem({ status: 404, detail: "Payment provider not found" });
  }

  const ensuredProviderInstance =
    await ensureWeChatPayPlatformCertificates(providerInstance);
  const port = createPaymentProviderPort({
    providerInstance: ensuredProviderInstance,
  });
  const normalized = await port.queryCharge({
    providerInstanceId: providerInstance.id,
    merchantOrderNo: tx.merchantOrderNo,
    providerTransactionId: tx.providerTransactionId,
  });
  const nextStatus = mapNormalizedStatusToTxStatus(normalized.status);
  const now = new Date();
  const updated = await paymentTxRepo.convergeChargeStatus({
    id: tx.id,
    status: nextStatus,
    providerStatus: normalized.providerStatus,
    providerTransactionId: normalized.providerTransactionId ?? null,
    providerSnapshot: normalized.providerSnapshot,
    failureCode: normalized.failureCode ?? null,
    failureMessage: normalized.failureMessage ?? null,
    succeededAt: nextStatus === "SUCCEEDED" ? now : null,
    closedAt: nextStatus === "CLOSED" ? now : null,
  });

  if (updated?.status === "SUCCEEDED") {
    await applyPaymentSettlementConsequence({ paymentTxId: updated.id });
  }

  return toPaymentTxProjection(updated ?? tx);
}

export async function getPaymentTxDetail(input: {
  paymentTxId: string;
  viewerUserId: string | null;
}): Promise<PaymentTxProjection> {
  if (!input.viewerUserId) {
    return throwHttpProblem({ status: 401, detail: "Authentication required" });
  }

  const tx = await paymentTxRepo.findById(input.paymentTxId as PaymentTxId);
  if (!tx) {
    return throwHttpProblem({ status: 404, detail: "PaymentTx not found" });
  }
  await resolveCheckoutBasis({
    billLineId: tx.billLineId,
    viewerUserId: input.viewerUserId as UserId,
  });

  return toPaymentTxProjection(tx);
}
