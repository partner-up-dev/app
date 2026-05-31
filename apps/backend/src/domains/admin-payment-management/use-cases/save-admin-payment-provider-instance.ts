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

const providerRepo = new PaymentProviderInstanceRepository();

export type AdminPaymentProviderInstanceInput = {
  providerType: PaymentProviderType;
  instanceKey: string;
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

  return {
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
  };
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

export async function createAdminPaymentProviderInstance(
  input: AdminPaymentProviderInstanceInput,
): Promise<AdminPaymentProviderInstanceView> {
  await assertUniqueInstanceKey({
    providerType: input.providerType,
    instanceKey: input.instanceKey,
  });
  await assertActiveClientAvailable({
    status: input.status,
    clientId: input.clientId,
  });

  const created = await providerRepo.create({
    providerType: input.providerType,
    instanceKey: input.instanceKey,
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

  await assertUniqueInstanceKey({
    providerType: input.payload.providerType,
    instanceKey: input.payload.instanceKey,
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
    instanceKey: input.payload.instanceKey,
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
