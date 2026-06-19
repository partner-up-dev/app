import type { BillId, BillLine, BillLineId } from "../../../entities/bill";
import type { PaymentProviderInstance, PaymentProviderInstanceId } from "../../../entities/payment";
import type { TradeOrder } from "../../../entities/trade-order";
import type { UserId } from "../../../entities/user";
import { throwHttpProblem } from "../../../lib/problem-details";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { BillRepository } from "../../../repositories/BillRepository";
import { PaymentProviderInstanceRepository } from "../../../repositories/PaymentProviderInstanceRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import { UserRepository } from "../../../repositories/UserRepository";
import { getOrderItemSkuName } from "../../trade";
import type { NormalizedPaymentStatus, PaymentClientAction } from "../model";
import {
  createPaymentProviderPort,
  deriveBillPaymentState,
  ensureWeChatPayPlatformCertificates,
  resolveWeChatPayChargeNotifyUrl,
} from "../services";
import { applyPaymentSettlementConsequence } from "./payment-settlement-consequence";

const billRepo = new BillRepository();
const billLineRepo = new BillLineRepository();
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
  payment: PaymentExecutionProjection | null;
};

export type PaymentExecutionStatus =
  | "ACTION_REQUIRED"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CLOSED";

export type PaymentExecutionProjection = {
  billLineId: string;
  kind: BillLine["kind"];
  status: PaymentExecutionStatus;
  amountFen: number;
  currency: "CNY";
  providerInstanceId: string | null;
  providerStatus: string | null;
  clientAction: PaymentClientAction | null;
  attemptCount: number;
  settledAt: string | null;
};

const canViewOrder = (order: TradeOrder, userId: string): boolean =>
  order.createdBy === userId ||
  order.participants.some((participant) => participant.userId === userId);

const isTerminalUnsettledProviderStatus = (status: NormalizedPaymentStatus): boolean =>
  status === "FAILED" || status === "CLOSED";

const toExecutionStatus = (status: NormalizedPaymentStatus): PaymentExecutionStatus => {
  if (status === "SUCCEEDED") return "SUCCEEDED";
  if (status === "FAILED") return "FAILED";
  if (status === "CLOSED") return "CLOSED";
  return "PROCESSING";
};

async function resolveCheckoutBasis(input: {
  billLineId: BillLineId;
  viewerUserId: UserId;
}): Promise<{
  line: BillLine;
  bill: NonNullable<Awaited<ReturnType<BillRepository["findById"]>>>;
  order: TradeOrder;
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
  const lineState = paymentState.lines[0];
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
    disabledReason,
  };
}

const toPaymentExecutionProjection = (input: {
  line: BillLine;
  status: PaymentExecutionStatus;
  providerStatus?: string | null;
  clientAction?: PaymentClientAction | null;
  providerInstanceId?: string | null;
}): PaymentExecutionProjection => ({
  billLineId: input.line.id,
  kind: input.line.kind,
  status: input.status,
  amountFen: input.line.amountFen,
  currency: input.line.currency,
  providerInstanceId: input.providerInstanceId ?? input.line.paymentProviderInstanceId ?? null,
  providerStatus: input.providerStatus ?? null,
  clientAction: input.clientAction ?? null,
  attemptCount: input.line.attemptCount,
  settledAt: input.line.settledAt?.toISOString() ?? null,
});

const buildCheckoutProjection = (input: {
  line: BillLine;
  bill: NonNullable<Awaited<ReturnType<BillRepository["findById"]>>>;
  order: TradeOrder;
  payment: PaymentExecutionProjection | null;
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
    itemName: input.order.items[0] ? getOrderItemSkuName(input.order.items[0]) : "订单项目",
  },
  eligibility: {
    payable: input.disabledReason === null,
    disabledReason: input.disabledReason,
  },
  payment: input.payment,
});

async function resolveProviderForClient(input: {
  clientId: string;
}): Promise<PaymentProviderInstance> {
  const providerInstance = await providerInstanceRepo.findActiveByClientId(input.clientId);
  if (!providerInstance) {
    return throwHttpProblem({
      status: 409,
      detail: `No active payment provider instance for client ${input.clientId}`,
    });
  }

  return ensureWeChatPayPlatformCertificates(providerInstance);
}

async function loadProviderInstance(
  providerInstanceId: PaymentProviderInstanceId,
): Promise<PaymentProviderInstance> {
  const providerInstance = await providerInstanceRepo.findById(providerInstanceId);
  if (!providerInstance || providerInstance.status !== "ACTIVE") {
    return throwHttpProblem({
      status: 404,
      detail: "Payment provider instance not found",
    });
  }

  return ensureWeChatPayPlatformCertificates(providerInstance);
}

async function queryChargePaymentForLine(
  line: BillLine,
): Promise<PaymentExecutionProjection | null> {
  if (line.settledAt) {
    return toPaymentExecutionProjection({
      line,
      status: "SUCCEEDED",
      providerStatus: "SETTLED",
    });
  }
  if (!line.paymentProviderInstanceId) {
    return null;
  }

  const providerInstance = await loadProviderInstance(line.paymentProviderInstanceId);
  const port = createPaymentProviderPort({ providerInstance });
  const merchantOrderNo = port.deriveChargeMerchantOrderNo({
    providerInstanceId: providerInstance.id,
    billLineId: line.id,
    kind: "CHARGE",
    attemptCount: line.attemptCount,
  });
  const normalized = await port.queryCharge({
    providerInstanceId: providerInstance.id,
    merchantOrderNo,
  });

  if (normalized.status === "SUCCEEDED") {
    const settledLine =
      (await billLineRepo.markSettledFromProvider({
        id: line.id,
        paymentProviderInstanceId: providerInstance.id,
        attemptCount: line.attemptCount,
        settledAt: new Date(),
      })) ??
      (await billLineRepo.findById(line.id)) ??
      line;
    await applyPaymentSettlementConsequence({ billLineId: settledLine.id });
    return toPaymentExecutionProjection({
      line: settledLine,
      status: "SUCCEEDED",
      providerStatus: normalized.providerStatus,
    });
  }

  if (isTerminalUnsettledProviderStatus(normalized.status)) {
    const clearedLine =
      (await billLineRepo.clearProviderExecutionSlot({
        id: line.id,
        paymentProviderInstanceId: providerInstance.id,
        attemptCount: line.attemptCount,
      })) ?? line;
    return toPaymentExecutionProjection({
      line: clearedLine,
      status: toExecutionStatus(normalized.status),
      providerStatus: normalized.providerStatus,
      providerInstanceId: providerInstance.id,
    });
  }

  return toPaymentExecutionProjection({
    line,
    status: toExecutionStatus(normalized.status),
    providerStatus: normalized.providerStatus,
  });
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
  const payment = await queryChargePaymentForLine(basis.line);
  const line = payment ? ((await billLineRepo.findById(basis.line.id)) ?? basis.line) : basis.line;

  return buildCheckoutProjection({
    line,
    bill: basis.bill,
    order: basis.order,
    payment,
    disabledReason: basis.disabledReason,
  });
}

async function openOrLoadChargeExecution(input: {
  line: BillLine;
  providerInstance: PaymentProviderInstance;
}): Promise<BillLine> {
  if (input.line.paymentProviderInstanceId) {
    return input.line;
  }

  const opened = await billLineRepo.openProviderExecutionSlot({
    id: input.line.id,
    paymentProviderInstanceId: input.providerInstance.id,
  });
  if (opened) return opened;

  const current = await billLineRepo.findById(input.line.id);
  if (!current) {
    return throwHttpProblem({ status: 404, detail: "BillLine not found" });
  }
  if (current.settledAt) {
    return throwHttpProblem({ status: 409, detail: "该账单行已支付" });
  }
  if (current.paymentProviderInstanceId) {
    return current;
  }

  return throwHttpProblem({
    status: 409,
    detail: "Payment execution could not be opened",
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

  const selectedProvider = basis.line.paymentProviderInstanceId
    ? await loadProviderInstance(basis.line.paymentProviderInstanceId)
    : await resolveProviderForClient({ clientId: input.clientId });
  const line = await openOrLoadChargeExecution({
    line: basis.line,
    providerInstance: selectedProvider,
  });
  if (line.kind !== "CHARGE") {
    return throwHttpProblem({
      status: 409,
      detail: "Only charge BillLine can create charge execution",
    });
  }
  if (line.settledAt) {
    return throwHttpProblem({ status: 409, detail: "该账单行已支付" });
  }
  if (!line.paymentProviderInstanceId) {
    return throwHttpProblem({
      status: 409,
      detail: "Payment provider execution slot is missing",
    });
  }

  const providerInstance = await loadProviderInstance(line.paymentProviderInstanceId);
  const port = createPaymentProviderPort({ providerInstance });
  const user = await userRepo.findById(input.viewerUserId as UserId);
  const requiresOpenId = providerInstance.config.chargeMode === "JSAPI";
  if (requiresOpenId && !user?.openId) {
    return throwHttpProblem({
      status: 409,
      detail: "WeChatPay charge requires a bound WeChat openid",
    });
  }

  const expiresAt = new Date(basis.order.timeout.unpaidExpiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    return throwHttpProblem({
      status: 409,
      detail: "Order unpaid window has expired",
    });
  }

  const merchantOrderNo = port.deriveChargeMerchantOrderNo({
    providerInstanceId: providerInstance.id,
    billLineId: line.id,
    kind: "CHARGE",
    attemptCount: line.attemptCount,
  });
  const prepay = await port.createChargePrepay({
    providerInstanceId: providerInstance.id,
    merchantOrderNo,
    amountFen: line.amountFen,
    currency: line.currency,
    description: line.label,
    payerOpenId: user?.openId ?? null,
    notifyUrl: resolveWeChatPayChargeNotifyUrl(providerInstance),
    expiresAt,
  });

  return buildCheckoutProjection({
    line,
    bill: basis.bill,
    order: basis.order,
    payment: toPaymentExecutionProjection({
      line,
      status: "ACTION_REQUIRED",
      providerStatus: prepay.providerStatus,
      clientAction: prepay.clientAction,
    }),
    disabledReason: null,
  });
}

export async function syncPaymentForBillLine(input: {
  billLineId: string;
  viewerUserId: string | null;
}): Promise<PaymentExecutionProjection> {
  if (!input.viewerUserId) {
    return throwHttpProblem({ status: 401, detail: "Authentication required" });
  }

  const basis = await resolveCheckoutBasis({
    billLineId: input.billLineId as BillLineId,
    viewerUserId: input.viewerUserId as UserId,
  });
  const payment = await queryChargePaymentForLine(basis.line);
  if (payment) return payment;

  return toPaymentExecutionProjection({
    line: basis.line,
    status: "CLOSED",
    providerStatus: "NO_PROVIDER_EXECUTION",
  });
}
