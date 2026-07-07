import { onBeforeUnmount, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import type { RouteLocationNormalizedLoaded } from "vue-router";
import { i18n } from "@/locales/i18n";
import {
  buildProductShareUrl,
  normalizePublicUrl,
  type ShareSpmRouteKey,
} from "@/shared/url/spm";
import { sanitizeSensitiveRoutePath } from "@/shared/url/sanitizeSensitiveRoutePath";
import {
  hasPendingWeChatOAuthHandoff,
  WECHAT_OAUTH_HANDOFF_CLEARED_EVENT,
} from "@/processes/wechat/oauth-handoff";
import type { RouteShareDescriptor } from "@/domains/share/model/types";
import {
  replayCurrentRouteShareDescriptor,
  startRouteShareSession,
} from "./route-share-controller";

type RouteShareFallback = {
  title: string;
  desc: string;
  routeKey?: ShareSpmRouteKey;
};

const normalizeText = (raw: string): string => raw.replace(/\s+/g, " ").trim();

const resolveCurrentLocale = (): string => {
  const locale = i18n.global.locale as string | { value: string };
  return typeof locale === "string" ? locale : locale.value;
};

const resolveDefaultImageUrl = (): string => {
  if (typeof window === "undefined") return "";
  return new URL("/share-logo.png", window.location.origin).toString();
};

const resolveFallbackText = (
  routeName: string | symbol | null | undefined,
): RouteShareFallback | null => {
  switch (routeName) {
    case "home":
      return {
        title: i18n.global.t("app.siteName"),
        desc: i18n.global.t("share.wechat.pageDescriptionHome"),
        routeKey: "home",
      };
    case "pr-create":
      return {
        title: `${i18n.global.t("createPage.title")} - ${i18n.global.t("app.name")}`,
        desc: i18n.global.t("share.wechat.pageDescriptionCreate"),
        routeKey: "pr-create",
      };
    case "contact-support":
      return {
        title: `${i18n.global.t("contactSupportPage.title")} - ${i18n.global.t("app.name")}`,
        desc: i18n.global.t("share.wechat.pageDescriptionContactSupport"),
        routeKey: "contact_support",
      };
    case "contact-author":
      return {
        title: `${i18n.global.t("contactAuthorPage.title")} - ${i18n.global.t("app.name")}`,
        desc: i18n.global.t("share.wechat.pageDescriptionContactAuthor"),
        routeKey: "contact_author",
      };
    case "pr-detail":
      return {
        title: i18n.global.t("prPage.metaFallbackTitle"),
        desc: i18n.global.t("prPage.metaFallbackDescription"),
        routeKey: "pr",
      };
    default:
      return null;
  }
};

const buildTargetUrl = (
  route: RouteLocationNormalizedLoaded,
  routeKey?: ShareSpmRouteKey,
): string => {
  if (typeof window === "undefined") return "";
  const routePath = sanitizeSensitiveRoutePath(route.fullPath);

  if (!routeKey) {
    return normalizePublicUrl({
      rawUrl: routePath,
      baseHref: window.location.href,
    });
  }

  return buildProductShareUrl({
    rawUrl: routePath,
    baseHref: window.location.href,
    routeKey,
    methodKey: "wechat_share",
  });
};

const buildRouteFallbackDescriptor = (
  route: RouteLocationNormalizedLoaded,
): Omit<RouteShareDescriptor, "routeSessionId"> | null => {
  if (typeof window === "undefined") return null;
  if (route.meta.wechatSharePolicy !== "route") return null;

  const fallback = resolveFallbackText(route.name);
  if (!fallback) return null;
  const routePath = sanitizeSensitiveRoutePath(route.fullPath);

  return {
    entityKey: null,
    revision: `fallback:${routePath}:${resolveCurrentLocale()}`,
    phase: "FALLBACK",
    signatureUrl: window.location.href,
    targetUrl: buildTargetUrl(route, fallback.routeKey),
    title: normalizeText(fallback.title),
    desc: normalizeText(fallback.desc),
    imgUrl: resolveDefaultImageUrl(),
  };
};

export const useRouteShareOrchestrator = () => {
  const route = useRoute();

  const startRouteSession = async (): Promise<void> => {
    if (hasPendingWeChatOAuthHandoff()) return;
    const descriptor = buildRouteFallbackDescriptor(route);
    await startRouteShareSession(descriptor);
  };

  watch(
    () =>
      [
        route.fullPath,
        route.name,
        route.meta.wechatSharePolicy,
        resolveCurrentLocale(),
      ] as const,
    () => {
      void startRouteSession();
    },
    { immediate: true },
  );

  const handlePageShow = (): void => {
    void replayCurrentRouteShareDescriptor("pageshow");
  };

  const handleVisibilityChange = (): void => {
    if (document.visibilityState !== "visible") return;
    void replayCurrentRouteShareDescriptor("visibilitychange");
  };

  const handleWeChatOAuthHandoffCleared = (): void => {
    void startRouteSession();
  };

  onMounted(() => {
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener(
      WECHAT_OAUTH_HANDOFF_CLEARED_EVENT,
      handleWeChatOAuthHandoffCleared,
    );
    document.addEventListener("visibilitychange", handleVisibilityChange);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("pageshow", handlePageShow);
    window.removeEventListener(
      WECHAT_OAUTH_HANDOFF_CLEARED_EVENT,
      handleWeChatOAuthHandoffCleared,
    );
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  });

  return {
    replayCurrentRouteShareDescriptor,
  };
};
