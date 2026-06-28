import type { BillLine, BillLineId } from "../../../entities/bill";
import type { PaymentProviderInstance, PaymentProviderInstanceId } from "../../../entities/payment";
import type { UserId } from "../../../entities/user";
import { resolveBillLineCheckoutBasis } from "../../bill";
import { throwHttpProblem } from "../../../lib/problem-details";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { PaymentProviderInstanceRepository } from "../../../repositories/PaymentProviderInstanceRepository";
import { UserRepository } from "../../../repositories/UserRepository";
import type { NormalizedPaymentStatus, PaymentClientAction } from "../model";
import {
  createPaymentProviderPort,
  decodePaymentTxId,
  encodePaymentTxId,
  ensureWeChatPayPlatformCertificates,
  resolveWeChatPayChargeNotifyUrl,
} from "../services";
import { openOrLoadChargeExecution, queryChargePaymentForLineAndReload } from "./payment-execution";
import { applyPaymentSettlementConsequence } from "./payment-settlement-consequence";

const providerRepo = new PaymentProviderInstanceRepository();
const billLineRepo = new BillLineRepository();
const userRepo = new UserRepository();

export type PaymentProviderOptionProjection = {
  paymentProviderInstanceId: string;
  label: string;
  providerType: PaymentProviderInstance["providerType"];
  channel: PaymentProviderInstance["config"]["chargeMode"];
  disabled: boolean;
  disabledReason: string | null;
};

export type PaymentProviderCatalogProjection = {
  providers: PaymentProviderOptionProjection[];
};

export type PaymentTxProjection = {
  paymentTxId: string;
  status: "ACTION_REQUIRED" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "CLOSED";
  billLineId: string;
  billId: string;
  orderId: string;
  kind: BillLine["kind"];
  amountFen: number;
  currency: "CNY";
  attemptCount: number;
  providerStatus: string | null;
  settledAt: string | null;
  provider: {
    paymentProviderInstanceId: string;
    label: string;
    providerType: PaymentProviderInstance["providerType"];
    channel: PaymentProviderInstance["config"]["chargeMode"];
  };
};

export type CreatePaymentChargeProjection = {
  paymentTx: PaymentTxProjection;
  clientAction: PaymentClientAction;
};

const toPaymentTxStatus = (status: NormalizedPaymentStatus): PaymentTxProjection["status"] => {
  if (status === "SUCCEEDED") return "SUCCEEDED";
  if (status === "FAILED") return "FAILED";
  if (status === "CLOSED") return "CLOSED";
  return "PROCESSING";
};

const buildProviderSummary = (
  providerInstance: PaymentProviderInstance,
): PaymentTxProjection["provider"] => ({
  paymentProviderInstanceId: providerInstance.id,
  label: providerInstance.displayName,
  providerType: providerInstance.providerType,
  channel: providerInstance.config.chargeMode,
});

const buildProviderOption = (
  providerInstance: PaymentProviderInstance,
): PaymentProviderOptionProjection => ({
  paymentProviderInstanceId: providerInstance.id,
  label: providerInstance.displayName,
  providerType: providerInstance.providerType,
  channel: providerInstance.config.chargeMode,
  disabled: false,
  disabledReason: null,
});

const buildPaymentTxProjection = (input: {
  paymentTxId: string;
  line: BillLine;
  orderId: string;
  providerInstance: PaymentProviderInstance;
  status: PaymentTxProjection["status"];
  providerStatus: string | null;
  attemptCount: number;
  settledAt?: string | null;
}): PaymentTxProjection => ({
  paymentTxId: input.paymentTxId,
  status: input.status,
  billLineId: input.line.id,
  billId: input.line.billId,
  orderId: input.orderId,
  kind: input.line.kind,
  amountFen: input.line.amountFen,
  currency: input.line.currency,
  attemptCount: input.attemptCount,
  providerStatus: input.providerStatus,
  settledAt:
    input.settledAt !== undefined ? input.settledAt : (input.line.settledAt?.toISOString() ?? null),
  provider: buildProviderSummary(input.providerInstance),
});

const loadChargeProviderForClient = async (input: {
  paymentProviderInstanceId: PaymentProviderInstanceId;
  clientId: string;
}): Promise<PaymentProviderInstance> => {
  const providerInstance = await providerRepo.findById(input.paymentProviderInstanceId);
  if (
    !providerInstance ||
    providerInstance.status !== "ACTIVE" ||
    providerInstance.clientId !== input.clientId
  ) {
    return throwHttpProblem({
      status: 404,
      detail: "Payment provider instance not found",
    });
  }

  return ensureWeChatPayPlatformCertificates(providerInstance);
};

const loadProviderInstanceForQuery = async (
  paymentProviderInstanceId: PaymentProviderInstanceId,
): Promise<PaymentProviderInstance> => {
  const providerInstance = await providerRepo.findById(paymentProviderInstanceId);
  if (!providerInstance) {
    return throwHttpProblem({
      status: 404,
      detail: "Payment provider instance not found",
    });
  }

  return ensureWeChatPayPlatformCertificates(providerInstance);
};

const queryChargePaymentTx = async (input: {
  paymentTxId: string;
  paymentProviderInstance: PaymentProviderInstance;
  line: BillLine;
  orderId: string;
  attemptCount: number;
}): Promise<PaymentTxProjection> => {
  if (
    input.line.settledAt &&
    input.line.paymentProviderInstanceId === input.paymentProviderInstance.id &&
    input.line.attemptCount === input.attemptCount
  ) {
    return buildPaymentTxProjection({
      paymentTxId: input.paymentTxId,
      line: input.line,
      orderId: input.orderId,
      providerInstance: input.paymentProviderInstance,
      status: "SUCCEEDED",
      providerStatus: "SETTLED",
      attemptCount: input.attemptCount,
      settledAt: input.line.settledAt?.toISOString() ?? null,
    });
  }

  const port = createPaymentProviderPort({
    providerInstance: input.paymentProviderInstance,
  });
  const merchantOrderNo = port.deriveChargeMerchantOrderNo({
    providerInstanceId: input.paymentProviderInstance.id,
    billLineId: input.line.id,
    kind: "CHARGE",
    attemptCount: input.attemptCount,
  });
  const normalized = await port.queryCharge({
    providerInstanceId: input.paymentProviderInstance.id,
    merchantOrderNo,
  });

  if (normalized.status === "SUCCEEDED") {
    const settledLine =
      (await billLineRepo.markSettledFromProvider({
        id: input.line.id as BillLineId,
        paymentProviderInstanceId: input.paymentProviderInstance.id,
        attemptCount: input.attemptCount,
        settledAt: new Date(),
      })) ??
      (await billLineRepo.findById(input.line.id as BillLineId)) ??
      input.line;
    await applyPaymentSettlementConsequence({ billLineId: settledLine.id });
    return buildPaymentTxProjection({
      paymentTxId: input.paymentTxId,
      line: settledLine,
      orderId: input.orderId,
      providerInstance: input.paymentProviderInstance,
      status: "SUCCEEDED",
      providerStatus: normalized.providerStatus,
      attemptCount: input.attemptCount,
      settledAt: settledLine.settledAt?.toISOString() ?? null,
    });
  }

  let line = input.line;
  if (
    (normalized.status === "FAILED" || normalized.status === "CLOSED") &&
    input.line.paymentProviderInstanceId === input.paymentProviderInstance.id &&
    input.line.attemptCount === input.attemptCount &&
    !input.line.settledAt
  ) {
    line =
      (await billLineRepo.clearProviderExecutionSlot({
        id: input.line.id as BillLineId,
        paymentProviderInstanceId: input.paymentProviderInstance.id,
        attemptCount: input.attemptCount,
      })) ?? input.line;
  }

  return buildPaymentTxProjection({
    paymentTxId: input.paymentTxId,
    line,
    orderId: input.orderId,
    providerInstance: input.paymentProviderInstance,
    status: toPaymentTxStatus(normalized.status),
    providerStatus: normalized.providerStatus,
    attemptCount: input.attemptCount,
    settledAt: null,
  });
};

export async function listPaymentProviders(input: {
  viewerUserId: string | null;
  clientId: string;
}): Promise<PaymentProviderCatalogProjection> {
  if (!input.viewerUserId) {
    return throwHttpProblem({ status: 401, detail: "Authentication required" });
  }

  const providers = await providerRepo.listActiveByClientId(input.clientId);
  return {
    providers: providers.map(buildProviderOption),
  };
}

export async function createPaymentCharge(input: {
  paymentProviderInstanceId: string;
  billLineId: string;
  viewerUserId: string | null;
  clientId: string;
}): Promise<CreatePaymentChargeProjection> {
  if (!input.viewerUserId) {
    return throwHttpProblem({ status: 401, detail: "Authentication required" });
  }

  const basis = await resolveBillLineCheckoutBasis({
    billLineId: input.billLineId as BillLineId,
    viewerUserId: input.viewerUserId as UserId,
  });
  if (basis.disabledReason) {
    return throwHttpProblem({ status: 409, detail: basis.disabledReason });
  }

  const requestedProvider = await loadChargeProviderForClient({
    paymentProviderInstanceId: input.paymentProviderInstanceId as PaymentProviderInstanceId,
    clientId: input.clientId,
  });
  const syncedLine = basis.line.paymentProviderInstanceId
    ? await queryChargePaymentForLineAndReload(basis.line)
    : basis.line;
  if (syncedLine.settledAt) {
    return throwHttpProblem({ status: 409, detail: "该账单行已支付" });
  }
  if (
    syncedLine.paymentProviderInstanceId &&
    syncedLine.paymentProviderInstanceId !== requestedProvider.id
  ) {
    return throwHttpProblem({
      status: 409,
      detail: "An unfinished payment is already bound to another provider",
      code: "PAYMENT_PROVIDER_CONFLICT",
    });
  }

  const line = await openOrLoadChargeExecution({
    line: syncedLine,
    providerInstance: requestedProvider,
  });
  if (line.kind !== "CHARGE") {
    return throwHttpProblem({
      status: 409,
      detail: "Only charge BillLine can create charge execution",
    });
  }
  if (line.settledAt || !line.paymentProviderInstanceId) {
    return throwHttpProblem({
      status: 409,
      detail: "BillLine is no longer chargeable",
    });
  }

  const user = await userRepo.findById(input.viewerUserId as UserId);
  if (requestedProvider.config.chargeMode === "JSAPI" && !user?.openId) {
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

  const port = createPaymentProviderPort({ providerInstance: requestedProvider });
  const merchantOrderNo = port.deriveChargeMerchantOrderNo({
    providerInstanceId: requestedProvider.id,
    billLineId: line.id,
    kind: "CHARGE",
    attemptCount: line.attemptCount,
  });
  const prepay = await port.createChargePrepay({
    providerInstanceId: requestedProvider.id,
    merchantOrderNo,
    amountFen: line.amountFen,
    currency: line.currency,
    description: line.label,
    payerOpenId: user?.openId ?? null,
    notifyUrl: resolveWeChatPayChargeNotifyUrl(requestedProvider),
    expiresAt,
  });

  const paymentTxId = encodePaymentTxId({
    kind: "CHARGE",
    billLineId: line.id,
    paymentProviderInstanceId: requestedProvider.id,
    attemptCount: line.attemptCount,
  });

  return {
    paymentTx: buildPaymentTxProjection({
      paymentTxId,
      line,
      orderId: basis.order.id,
      providerInstance: requestedProvider,
      status: "ACTION_REQUIRED",
      providerStatus: prepay.providerStatus,
      attemptCount: line.attemptCount,
      settledAt: null,
    }),
    clientAction: prepay.clientAction,
  };
}

export async function getPaymentTx(input: {
  paymentTxId: string;
  viewerUserId: string | null;
}): Promise<PaymentTxProjection> {
  if (!input.viewerUserId) {
    return throwHttpProblem({ status: 401, detail: "Authentication required" });
  }

  const reference = decodePaymentTxId(input.paymentTxId);
  if (reference.kind !== "CHARGE") {
    return throwHttpProblem({
      status: 404,
      detail: "PaymentTx not found",
    });
  }

  const basis = await resolveBillLineCheckoutBasis({
    billLineId: reference.billLineId as BillLineId,
    viewerUserId: input.viewerUserId as UserId,
  });
  const providerInstance = await loadProviderInstanceForQuery(
    reference.paymentProviderInstanceId as PaymentProviderInstanceId,
  );

  return queryChargePaymentTx({
    paymentTxId: input.paymentTxId,
    paymentProviderInstance: providerInstance,
    line: basis.line,
    orderId: basis.order.id,
    attemptCount: reference.attemptCount,
  });
}
