import { throwHttpProblem } from "../../../lib/problem-details";
import type {
  PaymentProviderCredentialSet,
  PaymentProviderInstance,
  PaymentProviderInstanceId,
  PaymentTx,
} from "../../../entities/payment";
import { PaymentProviderCredentialSetRepository } from "../../../repositories/PaymentProviderCredentialSetRepository";
import { PaymentProviderInstanceRepository } from "../../../repositories/PaymentProviderInstanceRepository";
import { PaymentTxRepository } from "../../../repositories/PaymentTxRepository";
import {
  createPaymentProviderPort,
} from "../services";
import type {
  NormalizedChargeStatus,
  NormalizedPaymentStatus,
  NormalizedRefundStatus,
  RawProviderNotification,
} from "../model";
import { applyPaymentSettlementConsequence } from "./payment-settlement-consequence";

const providerRepo = new PaymentProviderInstanceRepository();
const credentialRepo = new PaymentProviderCredentialSetRepository();
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
      detail: "Missing WeChat Pay notification signature headers",
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

async function loadProviderAndCredentials(
  providerInstanceId: string,
): Promise<{
  providerInstance: PaymentProviderInstance;
  credentialSets: PaymentProviderCredentialSet[];
}> {
  const providerInstance = await providerRepo.findById(
    providerInstanceId as PaymentProviderInstanceId,
  );
  if (!providerInstance || providerInstance.status !== "ACTIVE") {
    return throwHttpProblem({
      status: 404,
      detail: "Payment provider instance not found",
    });
  }

  const credentialSets =
    await credentialRepo.listVerifierUsableByProviderInstanceId(
      providerInstance.id,
    );
  if (credentialSets.length === 0) {
    return throwHttpProblem({
      status: 409,
      detail: "Payment provider credential set is missing",
    });
  }

  return {
    providerInstance,
    credentialSets,
  };
}

async function parseWithAvailableCredentials<T>(input: {
  providerInstance: PaymentProviderInstance;
  credentialSets: PaymentProviderCredentialSet[];
  notification: RawProviderNotification;
  parse: (
    credentialSet: PaymentProviderCredentialSet,
  ) => Promise<T>;
}): Promise<T> {
  let lastError: unknown = null;
  for (const credentialSet of input.credentialSets) {
    try {
      return await input.parse(credentialSet);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error("Failed to parse payment provider notification");
}

export async function handleWeChatPaymentNotification(input: {
  providerInstanceId: string;
  headers: WeChatNotificationHeadersInput;
  bodyText: string;
}): Promise<{ code: "SUCCESS"; message: string }> {
  const notification = normalizeNotificationInput(input);
  const { providerInstance, credentialSets } = await loadProviderAndCredentials(
    input.providerInstanceId,
  );

  const parsed = await parseWithAvailableCredentials<
    NormalizedChargeStatus & { merchantOrderNo: string }
  >({
    providerInstance,
    credentialSets,
    notification,
    parse: async (credentialSet) =>
      createPaymentProviderPort({
        providerInstance,
        credentialSet,
      }).parsePaymentNotification(notification),
  });

  const tx = await paymentTxRepo.findByProviderMerchantOrder({
    providerInstanceId: providerInstance.id,
    merchantOrderNo: parsed.merchantOrderNo,
  });
  if (!tx || tx.direction !== "CHARGE") {
    return throwHttpProblem({
      status: 404,
      detail: "PaymentTx not found for WeChat payment notification",
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

export async function handleWeChatRefundNotification(input: {
  providerInstanceId: string;
  headers: WeChatNotificationHeadersInput;
  bodyText: string;
}): Promise<{ code: "SUCCESS"; message: string }> {
  const notification = normalizeNotificationInput(input);
  const { providerInstance, credentialSets } = await loadProviderAndCredentials(
    input.providerInstanceId,
  );

  const parsed = await parseWithAvailableCredentials<
    NormalizedRefundStatus & { merchantRefundNo: string }
  >({
    providerInstance,
    credentialSets,
    notification,
    parse: async (credentialSet) =>
      createPaymentProviderPort({
        providerInstance,
        credentialSet,
      }).parseRefundNotification(notification),
  });

  const tx = await paymentTxRepo.findByProviderMerchantRefund({
    providerInstanceId: providerInstance.id,
    merchantRefundNo: parsed.merchantRefundNo,
  });
  if (!tx || tx.direction !== "REFUND") {
    return throwHttpProblem({
      status: 404,
      detail: "PaymentTx not found for WeChat refund notification",
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
