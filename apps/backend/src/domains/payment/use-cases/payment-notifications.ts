import { throwHttpProblem } from "../../../lib/problem-details";
import type {
  PaymentProviderInstance,
  PaymentProviderInstanceId,
  PaymentTx,
} from "../../../entities/payment";
import { PaymentProviderInstanceRepository } from "../../../repositories/PaymentProviderInstanceRepository";
import { PaymentTxRepository } from "../../../repositories/PaymentTxRepository";
import {
  createPaymentProviderPort,
  ensureWeChatPayPlatformCertificates,
  refreshWeChatPayPlatformCertificates,
  UnknownWeChatPayPlatformCertificateSerialError,
} from "../services";
import type {
  NormalizedChargeStatus,
  NormalizedPaymentStatus,
  NormalizedRefundStatus,
  RawProviderNotification,
} from "../model";
import { applyPaymentSettlementConsequence } from "./payment-settlement-consequence";

const providerRepo = new PaymentProviderInstanceRepository();
const paymentTxRepo = new PaymentTxRepository();

export type WeChatNotificationHeadersInput = {
  timestamp: string | null;
  nonce: string | null;
  signature: string | null;
  serial: string | null;
};

const mapNormalizedStatusToTxStatus = (
  status: NormalizedPaymentStatus,
): PaymentTx["status"] => {
  if (status === "SUCCEEDED") return "SUCCEEDED";
  if (status === "FAILED") return "FAILED";
  if (status === "CLOSED") return "CLOSED";
  return "PROCESSING";
};

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

async function loadProviderInstance(
  providerInstanceId: string,
): Promise<PaymentProviderInstance> {
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

  const refreshedProviderInstance =
    await refreshWeChatPayPlatformCertificates(input.providerInstance);
  return input.parse(refreshedProviderInstance);
}

export async function handleWeChatPayChargeNotification(input: {
  providerInstanceId: string;
  headers: WeChatNotificationHeadersInput;
  bodyText: string;
}): Promise<{ code: "SUCCESS"; message: string }> {
  const notification = normalizeNotificationInput(input);
  const providerInstance = await loadProviderInstance(input.providerInstanceId);

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

  const tx = await paymentTxRepo.findByProviderMerchantOrder({
    providerInstanceId: providerInstance.id,
    merchantOrderNo: parsed.merchantOrderNo,
  });
  if (!tx || tx.type !== "CHARGE") {
    return throwHttpProblem({
      status: 404,
      detail: "PaymentTx not found for WeChatPay charge notification",
    });
  }

  const nextStatus = mapNormalizedStatusToTxStatus(parsed.status);
  const now = new Date();
  const updated = await paymentTxRepo.convergeChargeStatus({
    id: tx.id,
    status: nextStatus,
    providerStatus: parsed.providerStatus,
    providerTransactionId: parsed.providerTransactionId ?? null,
    providerSnapshot: parsed.providerSnapshot,
    failureCode: parsed.failureCode ?? null,
    failureMessage: parsed.failureMessage ?? null,
    succeededAt: nextStatus === "SUCCEEDED" ? now : tx.succeededAt,
    closedAt: nextStatus === "CLOSED" ? now : tx.closedAt,
  });

  if (updated?.status === "SUCCEEDED") {
    await applyPaymentSettlementConsequence({ paymentTxId: updated.id });
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

  const tx = await paymentTxRepo.findByProviderMerchantRefund({
    providerInstanceId: providerInstance.id,
    merchantRefundNo: parsed.merchantRefundNo,
  });
  if (!tx || tx.type !== "REFUND") {
    return throwHttpProblem({
      status: 404,
      detail: "PaymentTx not found for WeChatPay refund notification",
    });
  }

  const nextStatus = mapNormalizedStatusToTxStatus(parsed.status);
  const now = new Date();
  await paymentTxRepo.convergeRefundStatus({
    id: tx.id,
    status: nextStatus,
    providerStatus: parsed.providerStatus,
    providerRefundId: parsed.providerRefundId ?? null,
    providerSnapshot: parsed.providerSnapshot,
    failureCode: parsed.failureCode ?? null,
    failureMessage: parsed.failureMessage ?? null,
    succeededAt: nextStatus === "SUCCEEDED" ? now : tx.succeededAt,
    closedAt: nextStatus === "CLOSED" ? now : tx.closedAt,
  });

  return {
    code: "SUCCESS",
    message: "成功",
  };
}
