import { onMounted, onUnmounted, ref } from "vue";

export const useReducedMotion = () => {
  const prefersReducedMotion = ref(false);
  let mediaQuery: MediaQueryList | null = null;
  let listener: ((event: MediaQueryListEvent) => void) | null = null;

  const updatePreference = () => {
    prefersReducedMotion.value = mediaQuery?.matches ?? false;
  };

  onMounted(() => {
    if (typeof window === "undefined") {
      return;
    }

    mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    listener = () => {
      updatePreference();
    };
    updatePreference();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", listener);
      return;
    }

    if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(listener);
    }
  });

  onUnmounted(() => {
    if (!mediaQuery || !listener) {
      return;
    }

    if (typeof mediaQuery.removeEventListener === "function") {
      mediaQuery.removeEventListener("change", listener);
      return;
    }

    if (typeof mediaQuery.removeListener === "function") {
      mediaQuery.removeListener(listener);
    }
  });

  return {
    prefersReducedMotion,
  };
};
