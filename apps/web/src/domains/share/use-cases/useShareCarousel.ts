import { computed, ref, watchEffect, type ComputedRef } from "vue";
import { trackEvent } from "@/shared/telemetry/track";
import { parsePRIdFromPathname } from "@/domains/pr/routing/routes";
import type { ShareSpmRouteKey } from "@/shared/url/spm";

export type ShareMethodId = "WEB_SHARE" | "XIAOHONGSHU" | "WECHAT_CHAT";

export type ShareMethod = {
  id: ShareMethodId;
  label: string;
  enabled?: boolean;
};

type UseShareCarouselOptions = {
  allMethods: ComputedRef<ShareMethod[]>;
  defaultMethodId?: ShareMethodId;
  autoRotateIntervalMs?: number | null;
  spmRouteKey?: ShareSpmRouteKey | null;
};

const FALLBACK_METHOD: ShareMethod = {
  id: "WEB_SHARE",
  label: "Web Share",
  enabled: true,
};

const resolveCurrentPRId = (): number | undefined => {
  if (typeof window === "undefined") return undefined;
  return parsePRIdFromPathname(window.location.pathname) ?? undefined;
};

export const useShareCarousel = ({
  allMethods,
  defaultMethodId = "XIAOHONGSHU",
  autoRotateIntervalMs = 3000,
  spmRouteKey = null,
}: UseShareCarouselOptions) => {
  const enabledMethods = computed(() =>
    allMethods.value.filter((m) => m.enabled ?? true),
  );

  const currentMethodId = ref<ShareMethodId>(defaultMethodId);
  const switchDirection = ref<"next" | "prev">("next");
  const hasUserInteracted = ref(false);

  watchEffect(() => {
    const enabled = enabledMethods.value;
    if (enabled.length === 0) {
      currentMethodId.value = "WEB_SHARE";
      return;
    }

    if (!enabled.some((m) => m.id === currentMethodId.value)) {
      currentMethodId.value = enabled[0].id;
    }
  });

  const currentMethod = computed(() => {
    const enabled = enabledMethods.value;
    return (
      enabled.find((m) => m.id === currentMethodId.value) ??
      enabled[0] ??
      FALLBACK_METHOD
    );
  });

  const transitionName = computed(() =>
    switchDirection.value === "next"
      ? "method-switch-next"
      : "method-switch-prev",
  );

  const markUserInteraction = (): void => {
    hasUserInteracted.value = true;
  };

  const moveMethod = (offset: 1 | -1): void => {
    switchDirection.value = offset === 1 ? "next" : "prev";

    const enabled = enabledMethods.value;
    if (enabled.length <= 1) return;

    const currentIndex = Math.max(
      0,
      enabled.findIndex((m) => m.id === currentMethod.value.id),
    );
    const nextIndex = (currentIndex + offset + enabled.length) % enabled.length;
    currentMethodId.value = enabled[nextIndex].id;
  };

  const goToPrevMethod = (): void => {
    markUserInteraction();
    moveMethod(-1);
    const prId = resolveCurrentPRId();
    trackEvent("share_method_switch", {
      methodId: currentMethodId.value,
      prId,
    });
    if (spmRouteKey === "pr" && prId !== undefined) {
      trackEvent("pr_secondary_action_click", {
        prId,
        actionType: "SHARE_METHOD_SWITCH",
        methodId: currentMethodId.value,
      });
    }
  };

  const goToNextMethod = (): void => {
    markUserInteraction();
    moveMethod(1);
    const prId = resolveCurrentPRId();
    trackEvent("share_method_switch", {
      methodId: currentMethodId.value,
      prId,
    });
    if (spmRouteKey === "pr" && prId !== undefined) {
      trackEvent("pr_secondary_action_click", {
        prId,
        actionType: "SHARE_METHOD_SWITCH",
        methodId: currentMethodId.value,
      });
    }
  };

  const handleShareMethodInteraction = (): void => {
    markUserInteraction();
  };

  watchEffect((onCleanup) => {
    if (typeof window === "undefined") return;
    if (autoRotateIntervalMs === null || autoRotateIntervalMs <= 0) return;
    if (hasUserInteracted.value) return;
    if (enabledMethods.value.length <= 1) return;

    const timerId = window.setInterval(() => {
      if (hasUserInteracted.value) return;
      moveMethod(1);
    }, autoRotateIntervalMs);

    onCleanup(() => {
      window.clearInterval(timerId);
    });
  });

  return {
    enabledMethods,
    currentMethod,
    transitionName,
    goToPrevMethod,
    goToNextMethod,
    handleShareMethodInteraction,
  };
};
