import { computed, type ComputedRef } from "vue";
import type { PRId } from "@partner-up-dev/backend";
import type { PRDetailView } from "@/domains/pr/model/types";
import type { RouteShareDescriptor } from "@/domains/share/model/types";
import { useCurrentRouteShareSessionId } from "@/domains/share/use-cases/route-share-controller";
import { buildProductShareUrl, normalizePublicUrl, type ShareSpmRouteKey } from "@/shared/url/spm";

type UsePRRouteShareDescriptorOptions = {
  id: ComputedRef<PRId | null>;
  pr: ComputedRef<PRDetailView | undefined>;
  spmRouteKey: ComputedRef<ShareSpmRouteKey | null>;
};

const resolveAbsoluteUrl = (rawUrl: string): string => {
  if (typeof window === "undefined") return rawUrl;
  return normalizePublicUrl({
    rawUrl,
    baseHref: window.location.href,
    removeSpm: false,
  });
};

export const usePRRouteShareDescriptor = ({
  id,
  pr,
  spmRouteKey,
}: UsePRRouteShareDescriptorOptions): ComputedRef<RouteShareDescriptor | null> => {
  const routeShareSessionId = useCurrentRouteShareSessionId();

  return computed(() => {
    if (typeof window === "undefined") return null;

    const detail = pr.value;
    const currentId = id.value;
    const routeKey = spmRouteKey.value;
    const routeSessionId = routeShareSessionId.value;

    if (!detail || currentId === null || routeKey === null || !routeSessionId) {
      return null;
    }
    if (detail.id !== currentId) {
      return null;
    }

    const canonicalShare = detail.share.canonical;
    const targetUrl = buildProductShareUrl({
      rawUrl: canonicalShare.canonicalPath,
      baseHref: window.location.href,
      routeKey,
      methodKey: "wechat_share",
    });
    const imgUrl =
      detail.share.wechatThumbnail?.posterUrl ??
      resolveAbsoluteUrl(canonicalShare.defaultImagePath);

    return {
      routeSessionId,
      entityKey: `pr:${detail.id}`,
      revision: canonicalShare.revision,
      phase: detail.share.wechatThumbnail ? "ENRICHED" : "BASE",
      signatureUrl: window.location.href,
      targetUrl,
      title: canonicalShare.title,
      desc: canonicalShare.description,
      imgUrl,
    };
  });
};
