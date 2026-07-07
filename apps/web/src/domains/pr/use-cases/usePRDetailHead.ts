import { computed, type Ref } from "vue";
import { useHead } from "@unhead/vue";
import { useI18n } from "vue-i18n";
import type { PRDetailView } from "@/domains/pr/model/types";

type UsePRDetailHeadOptions = {
  pr: Ref<PRDetailView | undefined>;
  shareUrl: Ref<string>;
};

export const usePRDetailHead = ({
  pr,
  shareUrl,
}: UsePRDetailHeadOptions): void => {
  const { t } = useI18n();

  const canonicalShare = computed(() => pr.value?.share.canonical ?? null);
  const documentTitle = computed(() =>
    canonicalShare.value?.title
      ? t("prPage.metaTitleWithName", { title: canonicalShare.value.title })
      : t("prPage.metaFallbackTitle"),
  );
  const shareTitle = computed(
    () => canonicalShare.value?.title || t("prPage.metaFallbackTitle"),
  );
  const description = computed(
    () =>
      canonicalShare.value?.description ||
      pr.value?.core.type ||
      t("prPage.metaFallbackDescription"),
  );
  const image = computed(() => {
    const detail = pr.value;
    if (!detail) return "";
    if (detail.share.wechatThumbnail?.posterUrl) {
      return detail.share.wechatThumbnail.posterUrl;
    }
    if (typeof window === "undefined") {
      return detail.share.canonical.defaultImagePath;
    }
    return new URL(
      detail.share.canonical.defaultImagePath,
      window.location.origin,
    ).toString();
  });

  useHead({
    title: documentTitle,
    meta: [
      { name: "description", content: description },
      { property: "og:title", content: shareTitle },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: shareUrl },
      { property: "og:site_name", content: t("app.siteName") },
      { property: "og:image", content: image },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: shareTitle },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
    ],
  });
};
