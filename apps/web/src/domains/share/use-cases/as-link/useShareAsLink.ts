import { computed, ref } from "vue";
import { copyToClipboard } from "@/lib/clipboard";
import { trackEvent } from "@/shared/telemetry/track";
import { parsePRIdFromPathname } from "@/domains/pr/routing/routes";
import { buildProductShareUrl, resolveSpmFromUrl, type ShareSpmRouteKey } from "@/shared/url/spm";

export type ShareState = "idle" | "sharing" | "shared" | "copied" | "error";

type UseShareAsLinkOptions = {
  shareUrl: () => string;
  spmRouteKey: ShareSpmRouteKey;
  getShareFailedText: () => string;
  getLoadingText: () => string;
  getSharedText: () => string;
  getCopiedText: () => string;
  getShareButtonText: () => string;
};

const resolvePRIdFromShareUrl = (url: string): number | undefined => {
  try {
    const parsed = new URL(url);
    return parsePRIdFromPathname(parsed.pathname) ?? undefined;
  } catch {
    return undefined;
  }
};

export const useShareAsLink = ({
  shareUrl,
  spmRouteKey,
  getShareFailedText,
  getLoadingText,
  getSharedText,
  getCopiedText,
  getShareButtonText,
}: UseShareAsLinkOptions) => {
  const shareState = ref<ShareState>("idle");

  const baseHref = computed(() => {
    if (typeof window === "undefined") return "http://localhost/";
    return window.location.href;
  });

  const normalizedUrl = computed(() =>
    buildProductShareUrl({
      rawUrl: shareUrl(),
      baseHref: baseHref.value,
      routeKey: spmRouteKey,
      methodKey: "web_share",
    }),
  );
  const shareSpm = computed(
    () => resolveSpmFromUrl(normalizedUrl.value, baseHref.value) ?? undefined,
  );

  const buttonLabel = computed(() => {
    if (shareState.value === "sharing") return getLoadingText();
    if (shareState.value === "shared") return getSharedText();
    if (shareState.value === "copied") return getCopiedText();
    if (shareState.value === "error") return getShareFailedText();
    return getShareButtonText();
  });

  const flashState = (next: ShareState): void => {
    shareState.value = next;
    window.setTimeout(() => {
      shareState.value = "idle";
    }, 2000);
  };

  const handleShare = async (): Promise<void> => {
    if (shareState.value === "sharing") return;

    shareState.value = "sharing";
    const prId = resolvePRIdFromShareUrl(normalizedUrl.value);
    const analyticsContext = prId ? { prId } : {};

    if (spmRouteKey === "pr" && prId !== undefined) {
      trackEvent("pr_secondary_action_click", {
        prId,
        actionType: "SHARE_LINK_TRIGGER",
      });
    }

    try {
      await copyToClipboard(normalizedUrl.value);
      trackEvent("share_link_copy_success", {
        url: normalizedUrl.value,
        spm: shareSpm.value,
        ...analyticsContext,
      });
      flashState("copied");
    } catch (error) {
      trackEvent("share_link_failed", {
        url: normalizedUrl.value,
        stage: "copy",
        spm: shareSpm.value,
        ...analyticsContext,
      });
      console.error("Failed to share/copy:", error);
      flashState("error");
    }
  };

  return {
    shareState,
    normalizedUrl,
    buttonLabel,
    handleShare,
  };
};
