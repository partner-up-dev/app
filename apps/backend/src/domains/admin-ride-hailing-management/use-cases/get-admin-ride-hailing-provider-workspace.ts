import { RideHailingProviderInstanceRepository } from "../../../repositories/RideHailingProviderInstanceRepository";
import {
  toAdminRideHailingProviderInstanceView,
  type AdminRideHailingProviderInstanceView,
} from "./provider-instance-view";

const providerRepo = new RideHailingProviderInstanceRepository();

export type AdminRideHailingProviderWorkspace = {
  providerInstances: AdminRideHailingProviderInstanceView[];
};

export async function getAdminRideHailingProviderWorkspace(): Promise<AdminRideHailingProviderWorkspace> {
  const providerInstances = await providerRepo.listAll();

  return {
    providerInstances: providerInstances.map(toAdminRideHailingProviderInstanceView),
  };
}
