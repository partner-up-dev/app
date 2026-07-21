import type { PaymentProviderInstance, PaymentProviderInstanceId } from "../../../entities/payment";
import { clearBillLinePaymentExecution, settleBillLinePaymentExecution } from "../../bill/commands";
import type { BillLinePaymentExecutionSnapshot } from "../../bill/contracts";
import { getBillLinePaymentExecution } from "../../bill/queries";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PaymentProviderInstanceRepository } from "../../../repositories/PaymentProviderInstanceRepository";
import type {
  NormalizedChargeStatus,
  NormalizedPaymentStatus,
  NormalizedRefundStatus,
  RawProviderNotification,
} from "../model";
import {
  createPaymentProviderPort,
  ensureWeChatPayPlatformCertificates,
  refreshWeChatPayPlatformCertificates,
  UnknownWeChatPayPlatformCertificateSerialError,
} from "../services";
import { applyPaymentSettlementConsequence } from "./payment-settlement-consequence";

const providerRepo = new PaymentProviderInstanceRepository();

export type WeChatNotificationHeadersInput = {
  timestamp: string | null;
  nonce: string | null;
  signature: string | null;
  serial: string | null;
};

const isTerminalUnsettledProviderStatus = (status: NormalizedPaymentStatus): boolean =>
  status === "FAILED" || status === "CLOSED";

const normalizeNotificationInput = (input: {
  headers: WeChatNotificationHeadersInput;
  bodyText: string;
}): RawProviderNotification => {
  const { timestamp, nonce, signature, serial } = input.headers;
  if (!timestamp || !nonce || !signature || !serial) {
    return throwHttpProblem({
      status: 400,
      detail: "Missing WeChatPay notification signature headers",
    });
  }

  return {
    headers: {
      timestamp,
      nonce,
      signature,
      serial,
    },
    bodyText: input.bodyText,
  };
};

async function loadProviderInstance(providerInstanceId: string): Promise<PaymentProviderInstance> {
  const providerInstance = await providerRepo.findById(
    providerInstanceId as PaymentProviderInstanceId,
  );
  if (!providerInstance || providerInstance.status !== "ACTIVE") {
    return throwHttpProblem({
      status: 404,
      detail: "Payment provider instance not found",
    });
  }

  return ensureWeChatPayPlatformCertificates(providerInstance);
}

async function parseWithProviderInstance<T>(input: {
  providerInstance: PaymentProviderInstance;
  notification: RawProviderNotification;
  parse: (providerInstance: PaymentProviderInstance) => Promise<T>;
}): Promise<T> {
  try {
    return await input.parse(input.providerInstance);
  } catch (error) {
    if (!(error instanceof UnknownWeChatPayPlatformCertificateSerialError)) {
      throw error;
    }
  }

  const refreshedProviderInstance = await refreshWeChatPayPlatformCertificates(
    input.providerInstance,
  );
  return input.parse(refreshedProviderInstance);
}

async function loadReferencedBillLine(input: {
  billLineId: string;
  expectedKind: BillLinePaymentExecutionSnapshot["kind"];
  providerInstanceId: PaymentProviderInstanceId;
  attemptCount: number;
}): Promise<BillLinePaymentExecutionSnapshot> {
  const line = await getBillLinePaymentExecution({ billLineId: input.billLineId });
  if (line.kind !== input.expectedKind) {
    return throwHttpProblem({
      status: 409,
      detail: "Payment provider reference kind does not match BillLine",
    });
  }
  if (line.attemptCount < input.attemptCount) {
    return throwHttpProblem({
      status: 409,
      detail: "Payment provider reference attempt was not issued",
    });
  }
  if (
    line.attemptCount === input.attemptCount &&
    line.paymentProviderInstanceId &&
    line.paymentProviderInstanceId !== input.providerInstanceId &&
    !line.settledAt
  ) {
    return throwHttpProblem({
      status: 409,
      detail: "Payment provider reference does not match current BillLine provider",
    });
  }

  return line;
}

async function settleBillLineFromProvider(input: {
  line: BillLinePaymentExecutionSnapshot;
  providerInstanceId: PaymentProviderInstanceId;
  attemptCount: number;
}): Promise<void> {
  const settlement = await settleBillLinePaymentExecution({
    billLineId: input.line.id,
    paymentProviderInstanceId: input.providerInstanceId,
    attemptCount: input.attemptCount,
    settledAt: new Date(),
  });
  if (settlement.status === "SETTLED" && settlement.line.kind === "CHARGE") {
    await applyPaymentSettlementConsequence({ billLineId: settlement.line.id });
  }
}

async function clearBillLineProviderBinding(input: {
  line: BillLinePaymentExecutionSnapshot;
  providerInstanceId: PaymentProviderInstanceId;
  attemptCount: number;
}): Promise<void> {
  await clearBillLinePaymentExecution({
    billLineId: input.line.id,
    paymentProviderInstanceId: input.providerInstanceId,
    attemptCount: input.attemptCount,
  });
}

export async function handleWeChatPayChargeNotification(input: {
  providerInstanceId: string;
  headers: WeChatNotificationHeadersInput;
  bodyText: string;
}): Promise<{ code: "SUCCESS"; message: string }> {
  const notification = normalizeNotificationInput(input);
  const providerInstance = await loadProviderInstance(input.providerInstanceId);
  const port = createPaymentProviderPort({ providerInstance });

  const parsed = await parseWithProviderInstance<
    NormalizedChargeStatus & { merchantOrderNo: string }
  >({
    providerInstance,
    notification,
    parse: async (currentProviderInstance) =>
      createPaymentProviderPort({
        providerInstance: currentProviderInstance,
      }).parseChargeNotification(notification),
  });
  const reference = port.parseMerchantPaymentReference(parsed.merchantOrderNo);
  if (reference.kind !== "CHARGE") {
    return throwHttpProblem({
      status: 409,
      detail: "WeChatPay charge notification reference is not a charge",
    });
  }

  const line = await loadReferencedBillLine({
    billLineId: reference.billLineId,
    expectedKind: "CHARGE",
    providerInstanceId: providerInstance.id,
    attemptCount: reference.attemptCount,
  });

  if (parsed.status === "SUCCEEDED") {
    await settleBillLineFromProvider({
      line,
      providerInstanceId: providerInstance.id,
      attemptCount: reference.attemptCount,
    });
  } else if (isTerminalUnsettledProviderStatus(parsed.status)) {
    await clearBillLineProviderBinding({
      line,
      providerInstanceId: providerInstance.id,
      attemptCount: reference.attemptCount,
    });
  }

  return {
    code: "SUCCESS",
    message: "成功",
  };
}

export async function handleWeChatPayRefundNotification(input: {
  providerInstanceId: string;
  headers: WeChatNotificationHeadersInput;
  bodyText: string;
}): Promise<{ code: "SUCCESS"; message: string }> {
  const notification = normalizeNotificationInput(input);
  const providerInstance = await loadProviderInstance(input.providerInstanceId);
  const port = createPaymentProviderPort({ providerInstance });

  const parsed = await parseWithProviderInstance<
    NormalizedRefundStatus & { merchantRefundNo: string }
  >({
    providerInstance,
    notification,
    parse: async (currentProviderInstance) =>
      createPaymentProviderPort({
        providerInstance: currentProviderInstance,
      }).parseRefundNotification(notification),
  });
  const reference = port.parseMerchantPaymentReference(parsed.merchantRefundNo);
  if (reference.kind !== "REFUND") {
    return throwHttpProblem({
      status: 409,
      detail: "WeChatPay refund notification reference is not a refund",
    });
  }

  const line = await loadReferencedBillLine({
    billLineId: reference.billLineId,
    expectedKind: "REFUND",
    providerInstanceId: providerInstance.id,
    attemptCount: reference.attemptCount,
  });

  if (parsed.status === "SUCCEEDED") {
    await settleBillLineFromProvider({
      line,
      providerInstanceId: providerInstance.id,
      attemptCount: reference.attemptCount,
    });
  } else if (isTerminalUnsettledProviderStatus(parsed.status)) {
    await clearBillLineProviderBinding({
      line,
      providerInstanceId: providerInstance.id,
      attemptCount: reference.attemptCount,
    });
  }

  return {
    code: "SUCCESS",
    message: "成功",
  };
}
