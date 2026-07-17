import { db } from "../../../lib/db";
import { throwHttpProblem } from "../../../lib/problem-details";
import type { PaymentProviderInstanceConfig, PaymentProviderType } from "../model";
import { normalizeAndValidateWeChatPayProviderConfig } from "../services/wechatpay-config-validation";
import { PaymentProviderInstanceRepository } from "../../../repositories/PaymentProviderInstanceRepository";

export type RegisterPaymentProviderInstanceInput = {
  providerType: PaymentProviderType;
  instanceKey: string;
  displayName: string;
  clientId: string;
  config: PaymentProviderInstanceConfig;
};

const isWeChatPayApiV3Config = (
  config: PaymentProviderInstanceConfig,
): config is Extract<PaymentProviderInstanceConfig, { adapterMode: "WECHAT_PAY_API_V3" }> =>
  config.adapterMode === "WECHAT_PAY_API_V3";

const mergeRegistrationConfig = (input: {
  next: PaymentProviderInstanceConfig;
  existing: PaymentProviderInstanceConfig | null;
}): PaymentProviderInstanceConfig => {
  if (
    input.existing &&
    isWeChatPayApiV3Config(input.existing) &&
    isWeChatPayApiV3Config(input.next) &&
    !Object.prototype.hasOwnProperty.call(input.next, "platformCertificates")
  ) {
    return {
      ...input.next,
      platformCertificates: input.existing.platformCertificates ?? null,
    };
  }

  return input.next;
};

export async function registerPaymentProviderInstance(
  input: RegisterPaymentProviderInstanceInput,
): Promise<{
  providerInstanceId: string;
}> {
  return db.transaction(async (tx) => {
    const providerRepo = new PaymentProviderInstanceRepository(tx);

    const existingProvider = await providerRepo.findByProviderTypeAndInstanceKey({
      providerType: input.providerType,
      instanceKey: input.instanceKey,
    });
    if (existingProvider && existingProvider.clientId !== input.clientId) {
      return throwHttpProblem({
        status: 409,
        detail: "Payment provider instance is already registered for another client",
      });
    }

    const config = mergeRegistrationConfig({
      next: input.config,
      existing: existingProvider?.config ?? null,
    });
    const validatedConfig = isWeChatPayApiV3Config(config)
      ? normalizeAndValidateWeChatPayProviderConfig(config)
      : config;

    const providerResult = existingProvider
      ? await providerRepo.updateRegistration({
          id: existingProvider.id,
          displayName: input.displayName,
          config: validatedConfig,
        })
      : await providerRepo.create({
          providerType: input.providerType,
          instanceKey: input.instanceKey,
          status: "ACTIVE",
          displayName: input.displayName,
          clientId: input.clientId,
          config: validatedConfig,
        });
    if (!providerResult) {
      return throwHttpProblem({
        status: 404,
        detail: "Payment provider instance was not found during registration",
      });
    }

    return {
      providerInstanceId: providerResult.id,
    };
  });
}
