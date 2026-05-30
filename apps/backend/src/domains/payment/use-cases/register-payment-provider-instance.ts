import { db } from "../../../lib/db";
import type {
  PaymentProviderInstanceConfig,
  PaymentProviderType,
  WeChatPayVerifierConfig,
} from "../model";
import { PaymentClientProviderBindingRepository } from "../../../repositories/PaymentClientProviderBindingRepository";
import { PaymentProviderCredentialSetRepository } from "../../../repositories/PaymentProviderCredentialSetRepository";
import { PaymentProviderInstanceRepository } from "../../../repositories/PaymentProviderInstanceRepository";

export type RegisterPaymentProviderInstanceInput = {
  providerType: PaymentProviderType;
  instanceKey: string;
  displayName: string;
  config: PaymentProviderInstanceConfig;
  credentialSet: {
    merchantSerialNo: string;
    merchantPrivateKeyPem: string;
    apiV3Key: string;
    verifier: WeChatPayVerifierConfig;
  };
  clientBindings: Array<{
    clientId: string;
    priority: number;
  }>;
};

export async function registerPaymentProviderInstance(
  input: RegisterPaymentProviderInstanceInput,
): Promise<{
  providerInstanceId: string;
  credentialSetId: string;
  clientBindingIds: string[];
}> {
  return db.transaction(async (tx) => {
    const providerRepo = new PaymentProviderInstanceRepository(tx);
    const credentialRepo = new PaymentProviderCredentialSetRepository(tx);
    const bindingRepo = new PaymentClientProviderBindingRepository(tx);

    const existingProvider = await providerRepo.findByProviderTypeAndInstanceKey({
      providerType: input.providerType,
      instanceKey: input.instanceKey,
    });
    const provider =
      existingProvider ??
      (await providerRepo.create({
        providerType: input.providerType,
        instanceKey: input.instanceKey,
        status: "ACTIVE",
        displayName: input.displayName,
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

    if (provider.activeCredentialSetId !== credential.id) {
      await providerRepo.setActiveCredentialSet({
        providerInstanceId: provider.id,
        credentialSetId: credential.id,
      });
    }

    const clientBindingIds: string[] = [];
    for (const binding of input.clientBindings) {
      const existingBinding =
        await bindingRepo.findActiveByClientProvider({
          clientId: binding.clientId,
          providerInstanceId: provider.id,
        });

      if (existingBinding) {
        clientBindingIds.push(existingBinding.id);
        continue;
      }

      const created = await bindingRepo.create({
        clientId: binding.clientId,
        providerInstanceId: provider.id,
        status: "ACTIVE",
        priority: binding.priority,
      });
      clientBindingIds.push(created.id);
    }

    return {
      providerInstanceId: provider.id,
      credentialSetId: credential.id,
      clientBindingIds,
    };
  });
}
