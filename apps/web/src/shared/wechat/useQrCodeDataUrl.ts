import { computed, ref, watch, type Ref } from "vue";
import { i18n } from "@/locales/i18n";

export const useQrCodeDataUrl = (
  active: Readonly<Ref<boolean>>,
  targetUrl: Readonly<Ref<string>>,
) => {
  const qrCodeDataUrlRef = ref<string | null>(null);
  const qrCodeErrorRef = ref<string | null>(null);
  let generationId = 0;

  watch(
    [active, targetUrl],
    async ([isActive, nextTargetUrl]) => {
      const currentGenerationId = generationId + 1;
      generationId = currentGenerationId;
      if (!isActive) return;

      qrCodeDataUrlRef.value = null;
      qrCodeErrorRef.value = null;

      if (!nextTargetUrl) {
        qrCodeErrorRef.value = i18n.global.t(
          "wechatMiniProgramWebView.qrFailed",
        );
        return;
      }

      try {
        const { default: QRCode } = await import("qrcode");
        const dataUrl = await QRCode.toDataURL(nextTargetUrl, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 320,
          color: {
            dark: "#111111",
            light: "#ffffff",
          },
        });
        if (currentGenerationId !== generationId) return;
        qrCodeDataUrlRef.value = dataUrl;
      } catch {
        if (currentGenerationId !== generationId) return;
        qrCodeErrorRef.value = i18n.global.t(
          "wechatMiniProgramWebView.qrFailed",
        );
      }
    },
    { immediate: true },
  );

  return {
    qrCodeDataUrl: computed(() => qrCodeDataUrlRef.value),
    qrCodeError: computed(() => qrCodeErrorRef.value),
  };
};
