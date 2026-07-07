import { onMounted, onUnmounted, ref, watch } from "vue";
import type { CSSProperties } from "vue";
import { useReducedMotion } from "@/shared/motion/useReducedMotion";

interface UseInViewStaggerOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
  baseDelayMs?: number;
  delayStepMs?: number;
}

const DEFAULT_THRESHOLD = 0.18;
const DEFAULT_ROOT_MARGIN = "0px 0px -8% 0px";
const DEFAULT_BASE_DELAY_MS = 40;
const DEFAULT_DELAY_STEP_MS = 84;

export const useInViewStagger = (
  options: UseInViewStaggerOptions = {},
) => {
  const {
    threshold = DEFAULT_THRESHOLD,
    rootMargin = DEFAULT_ROOT_MARGIN,
    once = true,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    delayStepMs = DEFAULT_DELAY_STEP_MS,
  } = options;

  const targetRef = ref<HTMLElement | null>(null);
  const isInView = ref(false);
  const { prefersReducedMotion } = useReducedMotion();

  let observer: IntersectionObserver | null = null;

  const disconnectObserver = () => {
    if (!observer) {
      return;
    }
    observer.disconnect();
    observer = null;
  };

  const createObserver = () => {
    if (typeof window === "undefined") {
      return;
    }

    if (prefersReducedMotion.value) {
      isInView.value = true;
      disconnectObserver();
      return;
    }

    if (typeof window.IntersectionObserver !== "function") {
      isInView.value = true;
      return;
    }

    const target = targetRef.value;
    if (!target) {
      return;
    }

    disconnectObserver();
    observer = new window.IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry) {
          return;
        }

        if (entry.isIntersecting) {
          isInView.value = true;
          if (once) {
            disconnectObserver();
          }
          return;
        }

        if (!once) {
          isInView.value = false;
        }
      },
      {
        threshold,
        rootMargin,
      },
    );
    observer.observe(target);
  };

  const itemMotionStyle = (index: number): CSSProperties => {
    const safeIndex = index < 0 ? 0 : index;
    return {
      "--pu-enter-delay": `${baseDelayMs + safeIndex * delayStepMs}ms`,
    };
  };

  watch(prefersReducedMotion, () => {
    createObserver();
  });

  watch(
    () => targetRef.value,
    () => {
      createObserver();
    },
  );

  onMounted(() => {
    createObserver();
  });

  onUnmounted(() => {
    disconnectObserver();
  });

  return {
    targetRef,
    isInView,
    itemMotionStyle,
    prefersReducedMotion,
  };
};
