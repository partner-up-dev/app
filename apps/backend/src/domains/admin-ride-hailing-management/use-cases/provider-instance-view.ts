import type { RideHailingProviderInstance } from "../../../entities/ride-hailing-provider";
import type { CaocaoProviderInstanceConfig } from "../../ride-hailing/contracts";
import { resolveRideHailingProviderOrderStatusCallbackUrl } from "../../ride-hailing/ports";

export type AdminCaocaoProviderInstanceConfigView = Omit<
  CaocaoProviderInstanceConfig,
  "signKey"
> & {
  signKeyConfigured: boolean;
};

export type AdminRideHailingProviderInstanceView = Omit<RideHailingProviderInstance, "config"> & {
  callbackUrl: string | null;
  config: AdminCaocaoProviderInstanceConfigView;
};

const resolveCallbackUrl = (providerInstance: RideHailingProviderInstance): string | null =>
  resolveRideHailingProviderOrderStatusCallbackUrl(providerInstance);

export function toAdminRideHailingProviderInstanceView(
  providerInstance: RideHailingProviderInstance,
): AdminRideHailingProviderInstanceView {
  const { signKey: _signKey, ...publicConfig } = providerInstance.config;

  return {
    ...providerInstance,
    callbackUrl: resolveCallbackUrl(providerInstance),
    config: {
      ...publicConfig,
      signKeyConfigured: providerInstance.config.signKey.length > 0,
    },
  };
}
