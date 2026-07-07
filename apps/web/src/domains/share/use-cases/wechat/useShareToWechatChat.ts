import { computed, ref, unref, watch, type MaybeRef } from "vue";
import type { PRId } from "@partner-up-dev/backend";
import type { PRShareData, RouteShareDescriptor } from "@/domains/share/model/types";
import { useGenerateWechatThumbHtml } from "@/domains/share/queries/useGenerateWechatThumbHtml";
import { renderPosterHtmlToBlob } from "@/domains/share/use-cases/poster/renderHtmlPoster";
import { useGenerateWechatThumbPoster } from "@/domains/share/use-cases/poster/useGenerateWechatThumbPoster";
import {
  submitRouteShareDescriptor,
  useCurrentRouteShareSessionId,
} from "@/domains/share/use-cases/route-share-controller";
import { useCloudStorage } from "@/shared/upload/useCloudStorage";
import {
  buildProductShareUrl,
  type ShareSpmRouteKey,
} from "@/shared/url/spm";
import { client } from "@/lib/rpc";

type Translate = (key: string) => string;

type UseShareToWechatChatOptions = {
  prId: MaybeRef<PRId>;
  shareUrl: MaybeRef<string>;
  spmRouteKey: MaybeRef<ShareSpmRouteKey>;
  prData: MaybeRef<PRShareData>;
  t: Translate;
  disabled?: MaybeRef<boolean>;
};

const truncateShareText = (value: string): string => {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > 80 ? `${text.slice(0, 79)}…` : text;
};

const toShareDescriptionFallback = (
  prData: PRShareData,
  t: Translate,
): string => {
  const rawText = truncateShareText(prData.rawText ?? "");
  if (rawText) return rawText;

  const summary = truncateShareText(
    [
      prData.type,
      prData.location,
      prData.budget ?? null,
      ...prData.preferences.slice(0, 2),
      prData.notes,
    ]
      .filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      )
      .join(" · "),
  );
  if (summary) return summary;

  const title = truncateShareText(prData.title ?? "");
  return title || t("home.subtitle");
};

export const useShareToWechatChat = ({
  prId,
  shareUrl,
  spmRouteKey,
  prData,
  t,
  disabled = false,
}: UseShareToWechatChatOptions) => {
  const styleIndex = ref(0);
  const errorMessage = ref<string | null>(null);
  const lastUploadedThumbnailUrl = ref<string | null>(null);
  const posterUrl = ref<string | null>(null);
  const isRendering = ref(false);
  const shareDesc = ref<string | null>(null);
  const isGeneratingDesc = ref(false);
  const scopeVersion = ref(0);
  const descriptionRequestVersion = ref(0);

  const currentPrId = computed(() => unref(prId));
  const currentShareUrl = computed(() => unref(shareUrl));
  const currentSpmRouteKey = computed(() => unref(spmRouteKey));
  const currentPrData = computed(() => unref(prData));
  const disabledRef = computed(() => Boolean(unref(disabled)));
  const routeShareSessionId = useCurrentRouteShareSessionId();

  const {
    mutateAsync: generateThumbHtmlAsync,
    isPending: isThumbHtmlGenerating,
  } = useGenerateWechatThumbHtml();
  const { generateThumb, isGenerating: isFallbackThumbGenerating } =
    useGenerateWechatThumbPoster();
  const { uploadImage, isUploading, uploadError } = useCloudStorage();

  const isWorking = computed(
    () =>
      isThumbHtmlGenerating.value ||
      isFallbackThumbGenerating.value ||
      isRendering.value ||
      isUploading.value,
  );

  const resolveBaseShareTitle = (): string => {
    const canonicalTitle = currentPrData.value.canonicalShare.title?.trim();
    if (canonicalTitle) return canonicalTitle;

    const title = currentPrData.value.title?.trim();
    return title && title.length > 0
      ? title
      : t("share.wechat.defaultShareTitle");
  };

  const resolveBaseShareDescription = (): string => {
    const canonicalDescription =
      currentPrData.value.canonicalShare.description?.trim();
    if (canonicalDescription) return canonicalDescription;
    return toShareDescriptionFallback(currentPrData.value, t);
  };

  const resolveCurrentShareDescription = (): string => {
    const generatedDescription = shareDesc.value?.replace(/\s+/g, " ").trim();
    if (generatedDescription) return generatedDescription;
    return resolveBaseShareDescription();
  };

  const switchButtonLabel = computed(() => {
    if (isWorking.value) return t("share.wechat.generating");
    return t("share.wechat.switchStyle");
  });

  const pickFallbackKeyText = (): string => {
    const title = currentPrData.value.title?.trim();
    if (title && title.length > 0) return title.slice(0, 3);

    const type = currentPrData.value.type?.trim();
    if (type && type.length > 0) return type.slice(0, 3);

    return t("share.wechat.fallbackKeyText");
  };

  const shareTitle = computed(() => resolveBaseShareTitle());
  const taggedShareUrl = computed(() =>
    buildProductShareUrl({
      rawUrl: currentShareUrl.value,
      baseHref:
        typeof window === "undefined" ? "http://localhost/" : window.location.href,
      routeKey: currentSpmRouteKey.value,
      methodKey: "wechat_share",
    }),
  );
  const shareDescPreview = computed(() => {
    const text = resolveCurrentShareDescription();
    if (!text) return t("share.wechat.generating");
    if (text.length <= 36) return text;
    return `${text.slice(0, 35)}…`;
  });
  const thumbPlaceholder = computed(() => pickFallbackKeyText());

  const isCurrentScopeActive = (
    targetScopeVersion: number,
    routeSessionAtStart: string | null,
  ): boolean =>
    targetScopeVersion === scopeVersion.value &&
    routeSessionAtStart === routeShareSessionId.value;

  const toEntityKey = (): string =>
    currentSpmRouteKey.value === "pr"
      ? `ANCHOR:${currentPrId.value}`
      : `COMMUNITY:${currentPrId.value}`;

  const buildEnrichedDescriptor = (
    imgUrl: string,
  ): RouteShareDescriptor | null => {
    if (typeof window === "undefined") return null;

    const routeSessionIdValue = routeShareSessionId.value;
    if (!routeSessionIdValue) return null;

    return {
      routeSessionId: routeSessionIdValue,
      entityKey: toEntityKey(),
      revision: currentPrData.value.canonicalShare.revision,
      phase: "ENRICHED",
      signatureUrl: window.location.href,
      targetUrl: taggedShareUrl.value,
      title: shareTitle.value,
      desc: resolveCurrentShareDescription(),
      imgUrl,
    };
  };

  const submitCurrentEnrichedDescriptor = async (
    imgUrl: string,
    targetScopeVersion: number,
    routeSessionAtStart: string | null,
  ): Promise<boolean> => {
    if (!isCurrentScopeActive(targetScopeVersion, routeSessionAtStart)) {
      return false;
    }

    const descriptor = buildEnrichedDescriptor(imgUrl);
    if (!descriptor) return false;

    return await submitRouteShareDescriptor(descriptor);
  };

  const generateDescriptionAsync = async (
    targetScopeVersion: number,
    routeSessionAtStart: string | null,
  ): Promise<void> => {
    const requestVersion = descriptionRequestVersion.value + 1;
    descriptionRequestVersion.value = requestVersion;

    try {
      isGeneratingDesc.value = true;

      const res = await client.api.share["wechat-card"][
        "generate-description"
      ].$post({
        json: {
          prId: currentPrId.value,
        },
      });

      let nextDescription = resolveBaseShareDescription();
      if (res.ok) {
        const data = (await res.json()) as { description: string };
        nextDescription = data.description;
      } else {
        console.warn("Failed to generate description, using fallback summary");
      }

      if (
        requestVersion !== descriptionRequestVersion.value ||
        !isCurrentScopeActive(targetScopeVersion, routeSessionAtStart)
      ) {
        return;
      }

      shareDesc.value = nextDescription;

      const currentPosterUrl =
        lastUploadedThumbnailUrl.value ??
        currentPrData.value.wechatThumbnail?.posterUrl ??
        null;
      if (!currentPosterUrl) return;

      try {
        await submitCurrentEnrichedDescriptor(
          currentPosterUrl,
          targetScopeVersion,
          routeSessionAtStart,
        );
      } catch (error) {
        console.warn(
          "Failed to submit WeChat share descriptor after description generation:",
          error,
        );
      }
    } catch (error) {
      console.warn("Error generating description:", error);

      if (
        requestVersion !== descriptionRequestVersion.value ||
        !isCurrentScopeActive(targetScopeVersion, routeSessionAtStart)
      ) {
        return;
      }

      shareDesc.value = resolveBaseShareDescription();
    } finally {
      if (requestVersion === descriptionRequestVersion.value) {
        isGeneratingDesc.value = false;
      }
    }
  };

  const handleGenerateAndUpdateInternal = async (
    targetScopeVersion: number,
    routeSessionAtStart: string | null,
  ): Promise<void> => {
    errorMessage.value = null;

    try {
      let blob: Blob;

      try {
        isRendering.value = true;
        const spec = await generateThumbHtmlAsync({
          prId: currentPrId.value,
          style: styleIndex.value,
        });

        if (!isCurrentScopeActive(targetScopeVersion, routeSessionAtStart)) {
          return;
        }

        blob = await renderPosterHtmlToBlob({
          html: spec.html,
          width: spec.width,
          height: spec.height,
          backgroundColor: spec.backgroundColor,
          scale: 2,
        });
      } catch (error) {
        if (!isCurrentScopeActive(targetScopeVersion, routeSessionAtStart)) {
          return;
        }

        console.warn(
          "HTML thumbnail generation failed, fallback to template:",
          error,
        );
        blob = await generateThumb(pickFallbackKeyText(), styleIndex.value);
      } finally {
        isRendering.value = false;
      }

      const thumbnailUrl = await uploadImage(blob, { purpose: "poster" });
      if (!isCurrentScopeActive(targetScopeVersion, routeSessionAtStart)) {
        return;
      }

      lastUploadedThumbnailUrl.value = thumbnailUrl;
      posterUrl.value = thumbnailUrl;

      try {
        await client.api.share["wechat-card"]["cache-thumbnail"].$post({
          json: {
            prId: currentPrId.value,
            style: styleIndex.value,
            posterUrl: thumbnailUrl,
          },
        });
      } catch (cacheError) {
        console.warn("Failed to cache thumbnail URL:", cacheError);
      }

      await submitCurrentEnrichedDescriptor(
        thumbnailUrl,
        targetScopeVersion,
        routeSessionAtStart,
      );

      if (!isCurrentScopeActive(targetScopeVersion, routeSessionAtStart)) {
        return;
      }

      styleIndex.value += 1;
    } catch (error) {
      if (!isCurrentScopeActive(targetScopeVersion, routeSessionAtStart)) {
        return;
      }

      errorMessage.value =
        error instanceof Error ? error.message : t("common.operationFailed");
      isRendering.value = false;
    }
  };

  const initializeCurrentScope = async (
    targetScopeVersion: number,
    routeSessionAtStart: string | null,
  ): Promise<void> => {
    errorMessage.value = null;
    void generateDescriptionAsync(targetScopeVersion, routeSessionAtStart);

    const cachedThumbnail = currentPrData.value.wechatThumbnail;
    if (cachedThumbnail) {
      lastUploadedThumbnailUrl.value = cachedThumbnail.posterUrl;
      posterUrl.value = cachedThumbnail.posterUrl;
      styleIndex.value = cachedThumbnail.style + 1;
      return;
    }

    await handleGenerateAndUpdateInternal(targetScopeVersion, routeSessionAtStart);
  };

  const resetCurrentScopeState = (): void => {
    scopeVersion.value += 1;
    descriptionRequestVersion.value += 1;
    errorMessage.value = null;
    lastUploadedThumbnailUrl.value = null;
    posterUrl.value = null;
    isRendering.value = false;
    shareDesc.value = null;
    isGeneratingDesc.value = false;
    styleIndex.value = 0;
  };

  const handleThumbnailLoadError = async (): Promise<void> => {
    if (!routeShareSessionId.value) return;
    console.warn("Thumbnail image failed to load, regenerating...");
    posterUrl.value = null;
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 100);
    });
    await handleGenerateAndUpdateInternal(
      scopeVersion.value,
      routeShareSessionId.value,
    );
  };

  const handleGenerateAndUpdate = async (): Promise<void> => {
    if (disabledRef.value) return;
    if (!routeShareSessionId.value) return;
    await handleGenerateAndUpdateInternal(
      scopeVersion.value,
      routeShareSessionId.value,
    );
  };

  const errorText = computed(
    () => errorMessage.value ?? uploadError.value,
  );

  watch(
    () =>
      [
        currentPrId.value,
        currentShareUrl.value,
        currentPrData.value.canonicalShare.revision,
        currentPrData.value.wechatThumbnail?.posterUrl ?? null,
        routeShareSessionId.value,
        disabledRef.value,
      ] as const,
    () => {
      resetCurrentScopeState();

      if (disabledRef.value) return;

      const routeSessionAtStart = routeShareSessionId.value;
      if (!routeSessionAtStart) return;

      void initializeCurrentScope(scopeVersion.value, routeSessionAtStart);
    },
    { immediate: true },
  );

  return {
    switchButtonLabel,
    isWorking,
    posterUrl,
    shareTitle,
    shareDescPreview,
    thumbPlaceholder,
    errorText,
    handleGenerateAndUpdate,
    handleThumbnailLoadError,
  };
};
