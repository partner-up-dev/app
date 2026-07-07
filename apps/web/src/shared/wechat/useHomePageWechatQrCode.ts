import { computed } from "vue";
import {
  PUBLIC_CONFIG_KEYS,
  usePublicConfig,
} from "@/shared/config/queries/usePublicConfig";

const normalizeHttpUrl = (value: string | null | undefined): string | null => {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
};

export const useHomePageWechatQrCode = () => {
  const homePageWechatQrCodeQuery = usePublicConfig(
    PUBLIC_CONFIG_KEYS.homePageWechatQrCode,
  );

  const homePageWechatQrCodeLoading = computed(
    () => homePageWechatQrCodeQuery.isLoading.value,
  );

  const homePageWechatQrCodeUrl = computed(() => {
    if (
      homePageWechatQrCodeQuery.isLoading.value ||
      homePageWechatQrCodeQuery.error.value
    ) {
      return null;
    }

    return normalizeHttpUrl(homePageWechatQrCodeQuery.data.value?.value);
  });

  return {
    homePageWechatQrCodeLoading,
    homePageWechatQrCodeUrl,
  };
};
