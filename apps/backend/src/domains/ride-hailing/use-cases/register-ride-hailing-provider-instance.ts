import { db } from "../../../lib/db";
import { throwHttpProblem } from "../../../lib/problem-details";
import { RideHailingProviderInstanceRepository } from "../../../repositories/RideHailingProviderInstanceRepository";
import type { RideHailingProviderRegisterInput } from "../model";
import { validateRideHailingProviderInstanceConfig } from "../services";

export async function registerRideHailingProviderInstance(
  input: RideHailingProviderRegisterInput,
): Promise<{
  providerInstanceId: string;
}> {
  const config = validateRideHailingProviderInstanceConfig({
    providerType: input.providerType,
    config: input.config,
  });

  return db.transaction(async (tx) => {
    const providerRepo = new RideHailingProviderInstanceRepository(tx);
    const existingProvider = await providerRepo.findByProviderTypeAndInstanceKey({
      providerType: input.providerType,
      instanceKey: input.instanceKey,
    });

    const providerResult = existingProvider
      ? await providerRepo.updateRegistration({
          id: existingProvider.id,
          displayName: input.displayName,
          config,
        })
      : await providerRepo.create({
          providerType: input.providerType,
          instanceKey: input.instanceKey,
          status: "ACTIVE",
          displayName: input.displayName,
          config,
        });

    if (!providerResult) {
      return throwHttpProblem({
        status: 404,
        detail: "Ride-hailing provider instance was not found during registration",
      });
    }

    return {
      providerInstanceId: providerResult.id,
    };
  });
}
