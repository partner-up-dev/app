import { computed, ref, watch } from "vue";
import type { ImageUploadPurpose } from "@partner-up-dev/backend/contracts";
import type {
  PuFileUploadItem,
  PuFileUploadRejection,
  PuFileUploadValue,
  PuFilesUploadValue,
} from "@partner-up-dev/design-web";
import { useCloudStorage } from "@/shared/upload/useCloudStorage";

export const IMAGE_UPLOAD_ACCEPT = "image/png,image/jpeg,image/webp";

type SingleImageUploadOptions = {
  getUrl: () => string;
  setUrl: (url: string) => void;
  purpose: ImageUploadPurpose;
  uploadingMessage?: string;
  onUploaded?: (url: string) => void;
};

type GalleryImageUploadOptions = {
  getUrls: () => readonly string[];
  setUrls: (urls: string[]) => void;
  purpose: ImageUploadPurpose;
  uploadingMessage?: string;
  onUploaded?: (url: string) => void;
};

const normalizeUrl = (url: string | undefined): string => url?.trim() ?? "";

const normalizeUrls = (urls: readonly string[]): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const rawUrl of urls) {
    const url = normalizeUrl(rawUrl);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    normalized.push(url);
  }
  return normalized;
};

const stringArraysEqual = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const fileNameFromUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url, "https://partner-up.local");
    const parts = parsedUrl.pathname.split("/").filter(Boolean);
    const lastPart = parts[parts.length - 1] ?? "";
    return decodeURIComponent(lastPart) || "image";
  } catch {
    return url || "image";
  }
};

export const imageUploadItemFromUrl = (url: string, name?: string): PuFileUploadItem => ({
  id: `url:${url}`,
  source: "url",
  name: name ?? fileNameFromUrl(url),
  url,
  status: "success",
});

const errorMessageFromUnknown = (error: unknown): string =>
  error instanceof Error ? error.message : "Upload failed";

export const useSingleImageUploadField = (options: SingleImageUploadOptions) => {
  const { uploadImage, isUploading, uploadError, clearError } = useCloudStorage();
  const uploadValue = ref<PuFileUploadValue>(null);
  const rejectionError = ref<string | null>(null);
  const cancelledItemIds = ref<Set<string>>(new Set());
  const currentFileItemId = ref<string | null>(null);

  const syncFromUrl = (rawUrl: string): void => {
    const url = normalizeUrl(rawUrl);
    uploadValue.value = url ? imageUploadItemFromUrl(url) : null;
  };

  watch(
    () => options.getUrl(),
    (url) => syncFromUrl(url),
    { immediate: true },
  );

  const setUrl = (url: string): void => {
    const normalizedUrl = normalizeUrl(url);
    if (normalizeUrl(options.getUrl()) !== normalizedUrl) {
      options.setUrl(normalizedUrl);
    }
  };

  const markCancelled = (itemId: string | null): void => {
    if (!itemId) return;
    cancelledItemIds.value = new Set([...cancelledItemIds.value, itemId]);
  };

  const handleUpdate = (item: PuFileUploadValue): void => {
    uploadValue.value = item;
    rejectionError.value = null;

    if (item === null) {
      markCancelled(currentFileItemId.value);
      setUrl("");
      clearError();
      return;
    }

    if (item.source === "url" && item.url) {
      setUrl(item.url);
      clearError();
    }
  };

  const handleAdd = async (item: PuFileUploadItem): Promise<void> => {
    rejectionError.value = null;

    if (item.source === "url" && item.url) {
      setUrl(item.url);
      uploadValue.value = imageUploadItemFromUrl(item.url, item.name);
      clearError();
      return;
    }

    if (!item.file) {
      uploadValue.value = item;
      return;
    }

    currentFileItemId.value = item.id;
    cancelledItemIds.value.delete(item.id);
    uploadValue.value = {
      ...item,
      status: "uploading",
      message: options.uploadingMessage,
    };

    try {
      const url = await uploadImage(item.file, { purpose: options.purpose });
      if (cancelledItemIds.value.has(item.id)) {
        return;
      }
      setUrl(url);
      options.onUploaded?.(url);
      uploadValue.value = imageUploadItemFromUrl(url, item.name);
    } catch (error) {
      if (cancelledItemIds.value.has(item.id)) {
        return;
      }
      uploadValue.value = {
        ...item,
        status: "error",
        message: uploadError.value ?? errorMessageFromUnknown(error),
      };
    } finally {
      if (currentFileItemId.value === item.id) {
        currentFileItemId.value = null;
      }
    }
  };

  const handleRemove = (item?: PuFileUploadItem): void => {
    markCancelled(item?.id ?? currentFileItemId.value);
    uploadValue.value = null;
    setUrl("");
    clearError();
    rejectionError.value = null;
  };

  const handleReject = (rejections: PuFileUploadRejection[]): void => {
    rejectionError.value = rejections[0]?.message ?? null;
  };

  const errorMessage = computed(() => rejectionError.value ?? uploadError.value);

  return {
    uploadValue,
    isUploading,
    errorMessage,
    handleUpdate,
    handleAdd,
    handleRemove,
    handleReject,
  };
};

export const useGalleryImageUploadField = (options: GalleryImageUploadOptions) => {
  const { uploadImage, isUploading, uploadError, clearError } = useCloudStorage();
  const uploadValue = ref<PuFilesUploadValue>([]);
  const rejectionError = ref<string | null>(null);
  const cancelledItemIds = ref<Set<string>>(new Set());

  const setUrls = (urls: readonly string[]): void => {
    const normalizedUrls = normalizeUrls(urls);
    if (!stringArraysEqual(normalizedUrls, normalizeUrls(options.getUrls()))) {
      options.setUrls(normalizedUrls);
    }
  };

  const syncFromUrls = (urls: readonly string[]): void => {
    const urlItems = normalizeUrls(urls).map((url) => imageUploadItemFromUrl(url));
    const transientItems = uploadValue.value.filter(
      (item) =>
        item.source === "file" && Boolean(item.file) && !cancelledItemIds.value.has(item.id),
    );
    uploadValue.value = [...urlItems, ...transientItems];
  };

  watch(
    () => options.getUrls(),
    (urls) => syncFromUrls(urls),
    { immediate: true },
  );

  const replaceItem = (nextItem: PuFileUploadItem): void => {
    const existingIndex = uploadValue.value.findIndex((item) => item.id === nextItem.id);
    if (existingIndex < 0) {
      uploadValue.value = [...uploadValue.value, nextItem];
      return;
    }
    uploadValue.value = uploadValue.value.map((item) =>
      item.id === nextItem.id ? nextItem : item,
    );
  };

  const syncUrlsFromUploadValue = (items: PuFilesUploadValue): void => {
    const urls = items.flatMap((item) => (item.source === "url" && item.url ? [item.url] : []));
    setUrls(urls);
  };

  const handleUpdate = (items: PuFilesUploadValue): void => {
    uploadValue.value = items;
    rejectionError.value = null;
    syncUrlsFromUploadValue(items);
  };

  const uploadFileItem = async (item: PuFileUploadItem): Promise<void> => {
    if (!item.file) return;

    cancelledItemIds.value.delete(item.id);
    replaceItem({
      ...item,
      status: "uploading",
      message: options.uploadingMessage,
    });

    try {
      const url = await uploadImage(item.file, { purpose: options.purpose });
      if (cancelledItemIds.value.has(item.id)) {
        return;
      }
      setUrls([...options.getUrls(), url]);
      options.onUploaded?.(url);
      uploadValue.value = uploadValue.value.filter((candidate) => candidate.id !== item.id);
    } catch (error) {
      if (cancelledItemIds.value.has(item.id)) {
        return;
      }
      replaceItem({
        ...item,
        status: "error",
        message: uploadError.value ?? errorMessageFromUnknown(error),
      });
    }
  };

  const handleAdd = async (items: PuFileUploadItem[]): Promise<void> => {
    rejectionError.value = null;
    const urlItems = items.flatMap((item) => (item.source === "url" && item.url ? [item.url] : []));
    if (urlItems.length > 0) {
      setUrls([...options.getUrls(), ...urlItems]);
      clearError();
    }

    for (const item of items) {
      if (item.source === "file") {
        await uploadFileItem(item);
      }
    }
  };

  const handleRemove = (item: PuFileUploadItem): void => {
    cancelledItemIds.value = new Set([...cancelledItemIds.value, item.id]);
    uploadValue.value = uploadValue.value.filter((candidate) => candidate.id !== item.id);
    if (item.url) {
      setUrls(options.getUrls().filter((url) => url !== item.url));
    }
    clearError();
    rejectionError.value = null;
  };

  const handleReject = (rejections: PuFileUploadRejection[]): void => {
    rejectionError.value = rejections[0]?.message ?? null;
  };

  const addUrl = (url: string): void => {
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) return;
    setUrls([...options.getUrls(), normalizedUrl]);
  };

  const errorMessage = computed(() => rejectionError.value ?? uploadError.value);

  return {
    uploadValue,
    isUploading,
    errorMessage,
    addUrl,
    handleUpdate,
    handleAdd,
    handleRemove,
    handleReject,
  };
};
