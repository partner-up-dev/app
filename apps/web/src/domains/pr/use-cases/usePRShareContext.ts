import { computed, type ComputedRef } from "vue";
import type { PRId } from "@partner-up-dev/backend";
import type { PRDetailView } from "@/domains/pr/model/types";
import type { PRShareData } from "@/domains/share/model/types";
import { normalizePublicUrl, type ShareSpmRouteKey } from "@/shared/url/spm";

type UsePRShareContextOptions = {
  id: ComputedRef<PRId | null>;
  pr: ComputedRef<PRDetailView | undefined>;
};

export const usePRShareContext = ({ id, pr }: UsePRShareContextOptions) => {
  const shareUrl = computed(() => {
    if (typeof window === "undefined") return "";
    const canonicalPath = pr.value?.share.canonical.canonicalPath;
    return normalizePublicUrl({
      rawUrl: canonicalPath ?? window.location.href,
      baseHref: window.location.href,
    });
  });

  const spmRouteKey = computed<ShareSpmRouteKey | null>(() => {
    if (!pr.value) return null;
    return "pr";
  });

  const prShareData = computed<PRShareData | null>(() => {
    if (!pr.value) return null;

    const sharedFields = {
      title: pr.value.title,
      type: pr.value.core.type,
      time: pr.value.core.time,
      location: pr.value.core.location,
      route: pr.value.core.route,
      minPartners: pr.value.core.minPartners,
      maxPartners: pr.value.core.maxPartners,
      partners: pr.value.core.partners,
      preferences: pr.value.core.preferences,
      notes: pr.value.core.notes,
      canonicalShare: pr.value.share.canonical,
      xiaohongshuPoster: pr.value.share.xiaohongshuPoster ?? null,
      wechatThumbnail: pr.value.share.wechatThumbnail ?? null,
      budget: pr.value.core.budget ?? null,
    };
    return sharedFields;
  });

  const canRenderShare = computed(
    () => id.value !== null && prShareData.value !== null && pr.value?.id === id.value,
  );

  return {
    shareUrl,
    spmRouteKey,
    prShareData,
    canRenderShare,
  };
};
