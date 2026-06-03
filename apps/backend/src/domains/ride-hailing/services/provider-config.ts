import { z } from "zod";
import {
  caocaoProviderInstanceConfigSchema,
  type RideHailingProviderInstanceConfig,
  type RideHailingProviderRegisterInput,
  type RideHailingProviderType,
} from "../model";

export const rideHailingProviderRegistrationConfigSchema = z.object({
  providerType: z.literal("CAOCAO"),
  instanceKey: z.string().min(1),
  displayName: z.string().min(1),
  config: caocaoProviderInstanceConfigSchema,
});

export function parseRideHailingProviderRegistrationConfig(
  input: unknown,
): RideHailingProviderRegisterInput {
  return rideHailingProviderRegistrationConfigSchema.parse(input);
}

export function validateRideHailingProviderInstanceConfig(input: {
  providerType: RideHailingProviderType;
  config: unknown;
}): RideHailingProviderInstanceConfig {
  if (input.providerType === "CAOCAO") {
    return caocaoProviderInstanceConfigSchema.parse(input.config);
  }

  throw new Error("Unsupported ride-hailing provider type");
}
