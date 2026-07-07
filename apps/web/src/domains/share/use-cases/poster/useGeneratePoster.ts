import { ref, computed, createApp, nextTick } from "vue";
import type { ComponentPublicInstance } from "vue";
import PosterTemplate from "@/domains/share/ui/templates/XhsPosterTemplate.vue";
import type { PosterData } from "@/lib/poster-types";
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

/**
 * HTML-to-image poster generation for Xiaohongshu
 * Creates styled posters using Vue templates and CSS
 */
export const useGeneratePoster = () => {
  const isGenerating = ref(false);
  const posterUrl = ref<string | null>(null);

  const generatePoster = async (caption: string, style = 0): Promise<Blob> => {
    isGenerating.value = true;

    try {
      // Prepare poster data
      const posterData: PosterData = {
        caption,
        style,
      };

      // Create a temporary container for rendering
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.top = "-10000px";
      tempContainer.style.left = "-10000px";
      tempContainer.style.pointerEvents = "none";
      document.body.appendChild(tempContainer);

      // Create Vue app instance with poster template
      const app = createApp(PosterTemplate, { data: posterData });

      // Mount the component
      const vm = app.mount(tempContainer) as ComponentPublicInstance;

      // Wait for Vue to render
      await nextTick();

      // Get the poster element
      const maybeExposed = vm as unknown as { posterElement?: unknown };
      const posterElement = unwrapHTMLElement(maybeExposed.posterElement);
      if (!posterElement) {
        throw new Error(i18n.global.t("errors.posterElementMissing"));
      }

      // Configure html2canvas options for high quality
      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(posterElement, {
        width: 540,
        height: 720,
        scale: 2, // Higher DPI for better quality
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false,
        onclone: (clonedDoc) => {
          // Ensure fonts are loaded in cloned document
          const clonedElement = clonedDoc.querySelector(".poster-template");
          if (clonedElement) {
            (clonedElement as HTMLElement).style.setProperty(
              "font-display",
              "block",
            );
          }
        },
      });

      // Convert canvas to blob
      const blob = await canvasToBlob(canvas);

      // Update poster URL for preview
      if (posterUrl.value) {
        URL.revokeObjectURL(posterUrl.value);
      }
      posterUrl.value = URL.createObjectURL(blob);

      // Cleanup
      app.unmount();
      document.body.removeChild(tempContainer);

      return blob;
    } catch (error) {
      console.error("Failed to generate poster:", error);
      throw new Error(
        i18n.global.t("errors.posterGenerationFailed", {
          message:
            error instanceof Error
              ? error.message
              : i18n.global.t("common.operationFailed"),
        }),
      );
    } finally {
      isGenerating.value = false;
    }
  };

  const clearPoster = () => {
    if (posterUrl.value) {
      URL.revokeObjectURL(posterUrl.value);
    }
    posterUrl.value = null;
  };

  return {
    generatePoster,
    clearPoster,
    isGenerating: computed(() => isGenerating.value),
    posterUrl: computed(() => posterUrl.value),
  };
};
