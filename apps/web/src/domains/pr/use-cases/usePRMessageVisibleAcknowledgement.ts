import { nextTick, onMounted, onUnmounted, ref, watch, type Ref } from "vue";
import type { PRId } from "@partner-up-dev/backend";

type VisibilityDocument = Pick<
  Document,
  "addEventListener" | "removeEventListener" | "visibilityState"
>;

type AttentionAcknowledgementTarget = {
  prId: PRId;
  acknowledgementCursor: number;
};

type AttentionAcknowledgementInput = {
  prId: Readonly<Ref<PRId>>;
  acknowledgementCursor: Readonly<Ref<number | null>>;
  enabled: Readonly<Ref<boolean>>;
  acknowledge: (input: AttentionAcknowledgementTarget) => Promise<unknown>;
  document?: VisibilityDocument | null;
};

const defaultDocument = (): VisibilityDocument | null =>
  typeof document === "undefined" ? null : document;

/**
 * A visible message thread controls notification frequency, not a user read
 * projection. It deliberately waits for a render commit and a visible browser
 * document before emitting the one semantic route action.
 */
export const usePRMessageVisibleAcknowledgement = (input: AttentionAcknowledgementInput): void => {
  const visibilityDocument = input.document ?? defaultDocument();
  const mounted = ref(false);
  const acknowledgedCursor = ref<number | null>(null);
  const acknowledgementPrId = ref<PRId | null>(null);
  const retriedCursor = ref<number | null>(null);
  let disposed = false;
  let queued = false;
  let activeTarget: AttentionAcknowledgementTarget | null = null;

  const resetForPR = (prId: PRId): void => {
    if (acknowledgementPrId.value === prId) return;
    acknowledgementPrId.value = prId;
    acknowledgedCursor.value = null;
    retriedCursor.value = null;
  };

  const visibleTarget = (): AttentionAcknowledgementTarget | null => {
    const cursor = input.acknowledgementCursor.value;
    if (
      disposed ||
      !mounted.value ||
      !input.enabled.value ||
      visibilityDocument?.visibilityState !== "visible" ||
      cursor === null
    ) {
      return null;
    }

    const prId = input.prId.value;
    resetForPR(prId);
    if (acknowledgedCursor.value !== null && acknowledgedCursor.value >= cursor) {
      return null;
    }
    if (activeTarget) return null;
    return { prId, acknowledgementCursor: cursor };
  };

  const matchesCurrentTarget = (target: AttentionAcknowledgementTarget): boolean =>
    !disposed &&
    input.prId.value === target.prId &&
    input.acknowledgementCursor.value === target.acknowledgementCursor;

  const attemptAcknowledgement = async (): Promise<void> => {
    const target = visibleTarget();
    if (!target) return;

    activeTarget = target;
    let retrySameCursor = false;
    try {
      await input.acknowledge(target);
      if (matchesCurrentTarget(target)) {
        acknowledgedCursor.value = Math.max(
          acknowledgedCursor.value ?? 0,
          target.acknowledgementCursor,
        );
        retriedCursor.value = null;
      }
    } catch {
      if (matchesCurrentTarget(target) && retriedCursor.value !== target.acknowledgementCursor) {
        retriedCursor.value = target.acknowledgementCursor;
        retrySameCursor = true;
      }
    } finally {
      activeTarget = null;
      const responseCursorChanged =
        !disposed &&
        input.prId.value === target.prId &&
        input.acknowledgementCursor.value !== target.acknowledgementCursor;
      if (retrySameCursor || responseCursorChanged) {
        scheduleAcknowledgement();
      }
    }
  };

  const scheduleAcknowledgement = (): void => {
    if (queued || disposed) return;
    queued = true;
    void nextTick().then(async () => {
      queued = false;
      await attemptAcknowledgement();
    });
  };

  const handleVisibilityChange = (): void => {
    if (visibilityDocument?.visibilityState === "visible") {
      scheduleAcknowledgement();
    }
  };

  watch(
    () => [input.prId.value, input.acknowledgementCursor.value, input.enabled.value] as const,
    ([prId]) => {
      resetForPR(prId);
      scheduleAcknowledgement();
    },
    { flush: "post", immediate: true },
  );

  onMounted(() => {
    mounted.value = true;
    visibilityDocument?.addEventListener("visibilitychange", handleVisibilityChange);
    scheduleAcknowledgement();
  });

  onUnmounted(() => {
    disposed = true;
    visibilityDocument?.removeEventListener("visibilitychange", handleVisibilityChange);
  });
};
