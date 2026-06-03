import type {
  PaymentProviderInstance,
  PaymentProviderInstanceId,
} from "../../../entities/payment";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PaymentProviderInstanceRepository } from "../../../repositories/PaymentProviderInstanceRepository";
import type {
  PaymentProviderInstanceStatus,
  PaymentProviderType,
  WeChatPayChargeMode,
  WeChatPayProviderInstanceConfig,
} from "../../payment/model";
import {
  toAdminPaymentProviderInstanceView,
  type AdminPaymentProviderInstanceView,
} from "./provider-instance-view";
import { normalizeAndValidateWeChatPayProviderConfig } from "../../payment/services/wechatpay-config-validation";

const providerRepo = new PaymentProviderInstanceRepository();

export type AdminPaymentProviderInstanceInput = {
  providerType: PaymentProviderType;
  displayName: string;
  status: PaymentProviderInstanceStatus;
  clientId: string;
  config: {
    adapterMode: "WECHAT_PAY_API_V3";
    appId: string;
    mchId: string;
    chargeMode: WeChatPayChargeMode;
    endpointBaseUrl?: string | null;
    apiV3Key?: string | null;
    merchantCertificate: {
      serialNo: string;
      privateKeyPem?: string | null;
      certificatePem?: string | null;
    };
  };
};

const derivePaymentProviderInstanceKey = (
  input: AdminPaymentProviderInstanceInput,
): string => {
  if (input.providerType === "WECHAT_PAY") {
    return `mch:${input.config.mchId.trim()}:app:${input.config.appId.trim()}`;
  }

  return throwHttpProblem({
    status: 422,
    detail: "Unsupported payment provider type",
  });
};

const normalizeOptionalString = (
  value: string | null | undefined,
): string | null => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
};

const requireConfigSecret = (input: {
  value: string | null;
  existingValue?: string | null;
  label: string;
}): string => {
  const resolved = input.value ?? input.existingValue ?? null;
  if (!resolved) {
    return throwHttpProblem({
      status: 422,
      detail: `${input.label} is required for a new payment provider instance`,
    });
  }
  return resolved;
};

const buildConfig = (input: {
  payload: AdminPaymentProviderInstanceInput;
  existingProviderInstance?: PaymentProviderInstance | null;
}): WeChatPayProviderInstanceConfig => {
  const existingConfig = input.existingProviderInstance?.config ?? null;
  const merchantCertificate = input.payload.config.merchantCertificate;

  return normalizeAndValidateWeChatPayProviderConfig({
    adapterMode: input.payload.config.adapterMode,
    appId: input.payload.config.appId,
    mchId: input.payload.config.mchId,
    chargeMode: input.payload.config.chargeMode,
    endpointBaseUrl: normalizeOptionalString(input.payload.config.endpointBaseUrl),
    apiV3Key: requireConfigSecret({
      value: normalizeOptionalString(input.payload.config.apiV3Key),
      existingValue: existingConfig?.apiV3Key,
      label: "WeChatPay apiV3Key",
    }),
    merchantCertificate: {
      serialNo: merchantCertificate.serialNo,
      privateKeyPem: requireConfigSecret({
        value: normalizeOptionalString(merchantCertificate.privateKeyPem),
        existingValue: existingConfig?.merchantCertificate.privateKeyPem,
        label: "WeChatPay merchant private key",
      }),
      certificatePem:
        normalizeOptionalString(merchantCertificate.certificatePem) ??
        existingConfig?.merchantCertificate.certificatePem ??
        null,
    },
    platformCertificates: existingConfig?.platformCertificates ?? null,
  });
};

const assertUniqueInstanceKey = async (input: {
  providerType: PaymentProviderType;
  instanceKey: string;
  currentProviderInstanceId?: PaymentProviderInstanceId;
}): Promise<void> => {
  const existing = await providerRepo.findByProviderTypeAndInstanceKey({
    providerType: input.providerType,
    instanceKey: input.instanceKey,
  });

  if (
    existing &&
    (!input.currentProviderInstanceId ||
      existing.id !== input.currentProviderInstanceId)
  ) {
    return throwHttpProblem({
      status: 409,
      detail: "Payment provider instance key already exists",
    });
  }
};

const assertActiveClientAvailable = async (input: {
  status: PaymentProviderInstanceStatus;
  clientId: string;
  currentProviderInstanceId?: PaymentProviderInstanceId;
}): Promise<void> => {
  if (input.status !== "ACTIVE") {
    return;
  }

  const existing = await providerRepo.findActiveByClientId(input.clientId);
  if (
    existing &&
    (!input.currentProviderInstanceId ||
      existing.id !== input.currentProviderInstanceId)
  ) {
    return throwHttpProblem({
      status: 409,
      detail: "Active payment provider instance already exists for clientId",
    });
  }
};

const assertProviderIdentityUnchanged = (input: {
  existingProviderInstance: PaymentProviderInstance;
  payload: AdminPaymentProviderInstanceInput;
}): void => {
  const existingConfig = input.existingProviderInstance.config;
  if (
    existingConfig.appId !== input.payload.config.appId ||
    existingConfig.mchId !== input.payload.config.mchId
  ) {
    return throwHttpProblem({
      status: 422,
      detail: "Payment provider instance appId and mchId cannot be changed",
    });
  }
};

export async function createAdminPaymentProviderInstance(
  input: AdminPaymentProviderInstanceInput,
): Promise<AdminPaymentProviderInstanceView> {
  const instanceKey = derivePaymentProviderInstanceKey(input);
  await assertUniqueInstanceKey({
    providerType: input.providerType,
    instanceKey,
  });
  await assertActiveClientAvailable({
    status: input.status,
    clientId: input.clientId,
  });

  const created = await providerRepo.create({
    providerType: input.providerType,
    instanceKey,
    status: input.status,
    displayName: input.displayName,
    clientId: input.clientId,
    config: buildConfig({ payload: input }),
  });

  return toAdminPaymentProviderInstanceView(created);
}

export async function updateAdminPaymentProviderInstance(input: {
  providerInstanceId: PaymentProviderInstanceId;
  payload: AdminPaymentProviderInstanceInput;
}): Promise<AdminPaymentProviderInstanceView> {
  const existing = await providerRepo.findById(input.providerInstanceId);
  if (!existing) {
    return throwHttpProblem({
      status: 404,
      detail: "Payment provider instance not found",
    });
  }

  assertProviderIdentityUnchanged({
    existingProviderInstance: existing,
    payload: input.payload,
  });

  const instanceKey = derivePaymentProviderInstanceKey(input.payload);
  await assertUniqueInstanceKey({
    providerType: input.payload.providerType,
    instanceKey,
    currentProviderInstanceId: existing.id,
  });
  await assertActiveClientAvailable({
    status: input.payload.status,
    clientId: input.payload.clientId,
    currentProviderInstanceId: existing.id,
  });

  const updated = await providerRepo.updateAdminConfiguration({
    id: existing.id,
    providerType: input.payload.providerType,
    instanceKey,
    status: input.payload.status,
    displayName: input.payload.displayName,
    clientId: input.payload.clientId,
    config: buildConfig({
      payload: input.payload,
      existingProviderInstance: existing,
    }),
  });

  if (!updated) {
    return throwHttpProblem({
      status: 404,
      detail: "Payment provider instance not found",
    });
  }

  return toAdminPaymentProviderInstanceView(updated);
}
