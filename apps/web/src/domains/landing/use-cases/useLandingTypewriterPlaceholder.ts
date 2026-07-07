import { computed, onMounted, onUnmounted, ref } from "vue";
import { useLandingRotatingTopic } from "@/domains/landing/use-cases/useLandingRotatingTopic";

const PLACEHOLDER_INITIAL_DELAY_MS = 180;
const PLACEHOLDER_HOLD_MS = 1400;
const PLACEHOLDER_TYPE_STEP_MS = 78;
const PLACEHOLDER_PUNCTUATION_STEP_MS = 126;
const PLACEHOLDER_ERASE_STEP_MS = 34;

const isPunctuation = (char: string): boolean => /[，。！？,.!?《》]/.test(char);

const normalizeIndex = (index: number, total: number): number => {
  if (total <= 0) return 0;
  return ((index % total) + total) % total;
};

export const useLandingTypewriterPlaceholder = () => {
  const { rotatingTopics } = useLandingRotatingTopic();

  const topicCount = rotatingTopics.length;
  const activeTopicIndex = ref(0);
  const typedExampleText = ref("");
  const pendingTimers: Array<{ id: number; resolve: () => void }> = [];
  let stopAnimation = false;

  const activeExampleText = computed(
    () =>
      rotatingTopics[normalizeIndex(activeTopicIndex.value, topicCount)]?.example ??
      "",
  );

  const wait = async (delayMs: number): Promise<void> => {
    await new Promise<void>((resolve) => {
      const timeoutId = window.setTimeout(() => {
        const timerIndex = pendingTimers.findIndex((timer) => timer.id === timeoutId);
        if (timerIndex >= 0) {
          pendingTimers.splice(timerIndex, 1);
        }
        resolve();
      }, delayMs);

      pendingTimers.push({ id: timeoutId, resolve });
    });
  };

  const typeExample = async (example: string): Promise<void> => {
    const chars = Array.from(example);
    for (let index = 0; index < chars.length && !stopAnimation; index += 1) {
      typedExampleText.value = chars.slice(0, index + 1).join("");
      await wait(
        isPunctuation(chars[index] ?? "")
          ? PLACEHOLDER_PUNCTUATION_STEP_MS
          : PLACEHOLDER_TYPE_STEP_MS,
      );
    }
  };

  const eraseExample = async (): Promise<void> => {
    const chars = Array.from(typedExampleText.value);
    for (let length = chars.length - 1; length >= 0 && !stopAnimation; length -= 1) {
      typedExampleText.value = chars.slice(0, length).join("");
      await wait(PLACEHOLDER_ERASE_STEP_MS);
    }
  };

  const clearPendingTimers = () => {
    for (const pendingTimer of pendingTimers) {
      window.clearTimeout(pendingTimer.id);
      pendingTimer.resolve();
    }
    pendingTimers.length = 0;
  };

  const runAnimation = async (): Promise<void> => {
    if (typeof window === "undefined" || topicCount === 0) {
      typedExampleText.value = activeExampleText.value;
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      typedExampleText.value = activeExampleText.value;
      return;
    }

    typedExampleText.value = "";
    await wait(PLACEHOLDER_INITIAL_DELAY_MS);

    while (!stopAnimation) {
      await typeExample(activeExampleText.value);

      if (stopAnimation || topicCount <= 1) {
        break;
      }

      await wait(PLACEHOLDER_HOLD_MS);
      if (stopAnimation) {
        break;
      }

      await eraseExample();
      if (stopAnimation) {
        break;
      }

      activeTopicIndex.value = normalizeIndex(activeTopicIndex.value + 1, topicCount);
    }
  };

  onMounted(() => {
    stopAnimation = false;
    void runAnimation();
  });

  onUnmounted(() => {
    stopAnimation = true;
    clearPendingTimers();
  });

  return {
    activeExampleText,
    typedExampleText,
  };
};
