import type { RideHailingProviderInstance } from "../../../entities/ride-hailing-provider";
import type { CaocaoProviderInstanceConfig } from "../../ride-hailing/model";
import { resolveCaocaoOrderStatusCallbackUrl } from "../../ride-hailing/services";

export type AdminCaocaoProviderInstanceConfigView = Omit<
  CaocaoProviderInstanceConfig,
  "signKey"
> & {
  signKeyConfigured: boolean;
};

export type AdminRideHailingProviderInstanceView = Omit<
  RideHailingProviderInstance,
  "config"
> & {
  callbackUrl: string | null;
  config: AdminCaocaoProviderInstanceConfigView;
};

const resolveCallbackUrl = (
  providerInstance: RideHailingProviderInstance,
): string | null => {
  if (
    providerInstance.providerType !== "CAOCAO" ||
    providerInstance.config.adapterMode !== "CAOCAO_OPEN_API" ||
    !providerInstance.config.callbackBaseUrl
  ) {
    return null;
  }

  return resolveCaocaoOrderStatusCallbackUrl(providerInstance);
};

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
