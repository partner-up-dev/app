import { PaymentProviderInstanceRepository } from "../../../repositories/PaymentProviderInstanceRepository";
import {
  toAdminPaymentProviderInstanceView,
  type AdminPaymentProviderInstanceView,
} from "./provider-instance-view";

const providerRepo = new PaymentProviderInstanceRepository();

export type AdminPaymentProviderWorkspace = {
  providerInstances: AdminPaymentProviderInstanceView[];
};

export async function getAdminPaymentProviderWorkspace(): Promise<AdminPaymentProviderWorkspace> {
  const providerInstances = await providerRepo.listAll();

  return {
    providerInstances: providerInstances.map(toAdminPaymentProviderInstanceView),
  };
}
