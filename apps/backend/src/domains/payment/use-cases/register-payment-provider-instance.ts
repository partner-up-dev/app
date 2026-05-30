import { db } from "../../../lib/db";
import { throwHttpProblem } from "../../../lib/problem-details";
import type {
  PaymentProviderInstanceConfig,
  PaymentProviderType,
  WeChatPayVerifierConfig,
} from "../model";
import { PaymentProviderCredentialSetRepository } from "../../../repositories/PaymentProviderCredentialSetRepository";
import { PaymentProviderInstanceRepository } from "../../../repositories/PaymentProviderInstanceRepository";

export type RegisterPaymentProviderInstanceInput = {
  providerType: PaymentProviderType;
  instanceKey: string;
  displayName: string;
  clientId: string;
  config: PaymentProviderInstanceConfig;
  credentialSet: {
    merchantSerialNo: string;
    merchantPrivateKeyPem: string;
    apiV3Key: string;
    verifier: WeChatPayVerifierConfig;
  };
};

export async function registerPaymentProviderInstance(
  input: RegisterPaymentProviderInstanceInput,
): Promise<{
  providerInstanceId: string;
  credentialSetId: string;
}> {
  return db.transaction(async (tx) => {
    const providerRepo = new PaymentProviderInstanceRepository(tx);
    const credentialRepo = new PaymentProviderCredentialSetRepository(tx);

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

    const provider =
      existingProvider ??
      (await providerRepo.create({
        providerType: input.providerType,
        instanceKey: input.instanceKey,
        status: "ACTIVE",
        displayName: input.displayName,
        clientId: input.clientId,
        config: input.config,
      }));

    const activeCredential =
      await credentialRepo.findActiveByProviderInstanceId(provider.id);
    const credential =
      activeCredential ??
      (await credentialRepo.create({
        providerInstanceId: provider.id,
        status: "ACTIVE",
        merchantSerialNo: input.credentialSet.merchantSerialNo,
        merchantPrivateKeyPem: input.credentialSet.merchantPrivateKeyPem,
        apiV3Key: input.credentialSet.apiV3Key,
        verifier: input.credentialSet.verifier,
      }));

    return {
      providerInstanceId: provider.id,
      credentialSetId: credential.id,
    };
  });
}
