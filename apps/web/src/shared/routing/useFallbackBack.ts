import { toValue, type MaybeRefOrGetter } from "vue";
import { useRouter, type RouteLocationRaw } from "vue-router";

type RouterHistoryState = {
  back?: string | null;
};

const defaultBackFallbackTo: RouteLocationRaw = { path: "/" };

const hasRouterBackEntry = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const historyState = window.history.state as RouterHistoryState | null;
  return typeof historyState?.back === "string" && historyState.back.length > 0;
};

export function useFallbackBack(fallbackTo?: MaybeRefOrGetter<RouteLocationRaw | undefined>) {
  const router = useRouter();

  const handleBack = async (): Promise<void> => {
    if (hasRouterBackEntry()) {
      router.back();
      return;
    }

    await router.replace(toValue(fallbackTo) ?? defaultBackFallbackTo);
  };

  return {
    handleBack,
  };
}
