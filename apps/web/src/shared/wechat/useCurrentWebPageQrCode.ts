import { computed, type Ref } from "vue";
import { useQrCodeDataUrl } from "@/shared/wechat/useQrCodeDataUrl";

const resolveCurrentUrl = (): string => {
  if (typeof window === "undefined") return "";
  return window.location.href;
};

export const useCurrentWebPageQrCode = (active: Readonly<Ref<boolean>>) => {
  const targetUrl = computed(() => resolveCurrentUrl());
  const { qrCodeDataUrl, qrCodeError } = useQrCodeDataUrl(active, targetUrl);

  return {
    targetUrl,
    qrCodeDataUrl,
    qrCodeError,
  };
};
