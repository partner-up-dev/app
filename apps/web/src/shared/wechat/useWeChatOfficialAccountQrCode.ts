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

export const useWeChatOfficialAccountQrCode = () => {
  const officialAccountQrCodeQuery = usePublicConfig(
    PUBLIC_CONFIG_KEYS.wechatOfficialAccountQrCode,
  );

  const officialAccountQrCodeLoading = computed(
    () => officialAccountQrCodeQuery.isLoading.value,
  );

  const officialAccountQrCodeUrl = computed(() => {
    if (
      officialAccountQrCodeQuery.isLoading.value ||
      officialAccountQrCodeQuery.error.value
    ) {
      return null;
    }

    return normalizeHttpUrl(officialAccountQrCodeQuery.data.value?.value);
  });

  return {
    officialAccountQrCodeLoading,
    officialAccountQrCodeUrl,
  };
};
