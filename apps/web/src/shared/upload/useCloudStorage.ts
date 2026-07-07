import { ref, readonly } from "vue";
import type { ImageUploadPurpose } from "@partner-up-dev/backend";
import { API_URL, client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";

export type UploadImageOptions = {
  purpose: ImageUploadPurpose;
};

export const useCloudStorage = () => {
  const isUploading = ref(false);
  const uploadError = ref<string | null>(null);

  const toUploadFile = (file: File | Blob): File => {
    if (file instanceof File) {
      return file;
    }

    return new File([file], "image", {
      type: file.type || "image/png",
    });
  };

  const uploadImage = async (
    file: File | Blob,
    options: UploadImageOptions,
  ): Promise<string> => {
    isUploading.value = true;
    uploadError.value = null;

    try {
      const res = await client.api.upload.images[":purpose"].$post({
        param: {
          purpose: options.purpose,
        },
        form: {
          image: toUploadFile(file),
        },
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(
          error.error ||
            `${i18n.global.t("errors.uploadFailed")}: ${res.statusText}`,
        );
      }

      const { url } = await res.json();

      const base = API_URL || window.location.origin;
      return new URL(url, base).toString();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : i18n.global.t("errors.uploadFailed");
      uploadError.value = errorMessage;
      throw new Error(errorMessage);
    } finally {
      isUploading.value = false;
    }
  };

  /**
   * Clear any upload errors
   */
  const clearError = () => {
    uploadError.value = null;
  };

  return {
    uploadImage,
    isUploading: readonly(isUploading),
    uploadError: readonly(uploadError),
    clearError,
  };
};
