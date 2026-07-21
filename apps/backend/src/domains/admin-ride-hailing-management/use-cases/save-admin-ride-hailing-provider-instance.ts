import type {
  RideHailingProviderInstance,
  RideHailingProviderInstanceId,
} from "../../../entities/ride-hailing-provider";
import { throwHttpProblem } from "../../../lib/problem-details";
import { RideHailingProviderInstanceRepository } from "../../../repositories/RideHailingProviderInstanceRepository";
import type {
  CaocaoProviderInstanceConfig,
  RideHailingProviderInstanceStatus,
  RideHailingProviderType,
} from "../../ride-hailing/contracts";
import { validateRideHailingProviderInstanceConfig } from "../../ride-hailing/contracts";
import {
  toAdminRideHailingProviderInstanceView,
  type AdminRideHailingProviderInstanceView,
} from "./provider-instance-view";

const providerRepo = new RideHailingProviderInstanceRepository();

export type AdminRideHailingProviderInstanceInput = {
  providerType: RideHailingProviderType;
  instanceKey: string;
  displayName: string;
  status: RideHailingProviderInstanceStatus;
  config: Omit<CaocaoProviderInstanceConfig, "signKey"> & {
    signKey?: string | null;
  };
};

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
};

const buildConfig = (input: {
  payload: AdminRideHailingProviderInstanceInput;
  existingProviderInstance?: RideHailingProviderInstance | null;
}): CaocaoProviderInstanceConfig => {
  const incomingSignKey = normalizeOptionalString(input.payload.config.signKey);
  const signKey = incomingSignKey ?? input.existingProviderInstance?.config.signKey ?? null;

  if (!signKey) {
    return throwHttpProblem({
      status: 422,
      detail: "Caocao signKey is required for a new provider instance",
    });
  }

  return validateRideHailingProviderInstanceConfig({
    providerType: input.payload.providerType,
    config: {
      adapterMode: input.payload.config.adapterMode,
      caocaoClientId: input.payload.config.caocaoClientId,
      signKey,
      endpointBaseUrl: input.payload.config.endpointBaseUrl,
      callbackBaseUrl: normalizeOptionalString(input.payload.config.callbackBaseUrl),
      requestTimeoutMs: input.payload.config.requestTimeoutMs ?? null,
    },
  });
};

const assertUniqueInstanceKey = async (input: {
  providerType: RideHailingProviderType;
  instanceKey: string;
  currentProviderInstanceId?: RideHailingProviderInstanceId;
}): Promise<void> => {
  const existing = await providerRepo.findByProviderTypeAndInstanceKey({
    providerType: input.providerType,
    instanceKey: input.instanceKey,
  });

  if (
    existing &&
    (!input.currentProviderInstanceId || existing.id !== input.currentProviderInstanceId)
  ) {
    return throwHttpProblem({
      status: 409,
      detail: "Ride-hailing provider instance key already exists",
    });
  }
};

export async function createAdminRideHailingProviderInstance(
  input: AdminRideHailingProviderInstanceInput,
): Promise<AdminRideHailingProviderInstanceView> {
  await assertUniqueInstanceKey({
    providerType: input.providerType,
    instanceKey: input.instanceKey,
  });

  const created = await providerRepo.create({
    providerType: input.providerType,
    instanceKey: input.instanceKey,
    status: input.status,
    displayName: input.displayName,
    config: buildConfig({ payload: input }),
  });

  return toAdminRideHailingProviderInstanceView(created);
}

export async function updateAdminRideHailingProviderInstance(input: {
  providerInstanceId: RideHailingProviderInstanceId;
  payload: AdminRideHailingProviderInstanceInput;
}): Promise<AdminRideHailingProviderInstanceView> {
  const existing = await providerRepo.findById(input.providerInstanceId);
  if (!existing) {
    return throwHttpProblem({
      status: 404,
      detail: "Ride-hailing provider instance not found",
    });
  }

  await assertUniqueInstanceKey({
    providerType: input.payload.providerType,
    instanceKey: input.payload.instanceKey,
    currentProviderInstanceId: existing.id,
  });

  const updated = await providerRepo.updateAdminConfiguration({
    id: existing.id,
    providerType: input.payload.providerType,
    instanceKey: input.payload.instanceKey,
    status: input.payload.status,
    displayName: input.payload.displayName,
    config: buildConfig({
      payload: input.payload,
      existingProviderInstance: existing,
    }),
  });

  if (!updated) {
    return throwHttpProblem({
      status: 404,
      detail: "Ride-hailing provider instance not found",
    });
  }

  return toAdminRideHailingProviderInstanceView(updated);
}
