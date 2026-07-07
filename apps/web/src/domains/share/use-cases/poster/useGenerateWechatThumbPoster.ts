import { computed, createApp, nextTick, ref } from "vue";
import type { ComponentPublicInstance } from "vue";
import WechatThumbTemplate from "@/domains/share/ui/templates/WechatShareThumbTemplate.vue";
import { i18n } from "@/locales/i18n";
import { loadHtml2Canvas } from "./html2canvas-loader";

const unwrapHTMLElement = (value: unknown): HTMLElement | null => {
  if (value instanceof HTMLElement) return value;

  if (typeof value === "object" && value !== null && "value" in value) {
    const candidate = (value as { value?: unknown }).value;
    if (candidate instanceof HTMLElement) return candidate;
  }

  return null;
};

const canvasToBlob = async (canvas: HTMLCanvasElement): Promise<Blob> => {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error(i18n.global.t("errors.canvasBlobFailed")));
        } else {
          resolve(blob);
        }
      },
      "image/png",
      0.95,
    );
  });
};

export const useGenerateWechatThumbPoster = () => {
  const isGenerating = ref(false);
  const posterUrl = ref<string | null>(null);

  const generateThumb = async (keyText: string, style = 0): Promise<Blob> => {
    isGenerating.value = true;

    try {
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.top = "-10000px";
      tempContainer.style.left = "-10000px";
      tempContainer.style.pointerEvents = "none";
      document.body.appendChild(tempContainer);

      const app = createApp(WechatThumbTemplate, { keyText, style });
      const vm = app.mount(tempContainer) as ComponentPublicInstance;
      await nextTick();

      const maybeExposed = vm as unknown as { thumbElement?: unknown };
      const element = unwrapHTMLElement(maybeExposed.thumbElement);
      if (!element) {
        throw new Error(i18n.global.t("errors.thumbnailElementMissing"));
      }

      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(element, {
        width: 300,
        height: 300,
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false,
        windowWidth: 300,
        windowHeight: 300,
      });

      const blob = await canvasToBlob(canvas);

      if (posterUrl.value) {
        URL.revokeObjectURL(posterUrl.value);
      }
      posterUrl.value = URL.createObjectURL(blob);

      app.unmount();
      document.body.removeChild(tempContainer);

      return blob;
    } finally {
      isGenerating.value = false;
    }
  };

  const clearPoster = (): void => {
    if (posterUrl.value) {
      URL.revokeObjectURL(posterUrl.value);
    }
    posterUrl.value = null;
  };

  return {
    generateThumb,
    clearPoster,
    isGenerating: computed(() => isGenerating.value),
    posterUrl: computed(() => posterUrl.value),
  };
};
