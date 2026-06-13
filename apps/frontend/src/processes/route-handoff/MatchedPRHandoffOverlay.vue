<template>
  <Teleport to="body">
    <div
      v-if="isVisible"
      class="matched-pr-handoff"
      :class="[`matched-pr-handoff--${handoff.state.phase.toLowerCase()}`]"
      aria-live="polite"
    >
      <LiquidWaveSplash
        class="matched-pr-handoff__splash"
        :duration-ms="MATCHED_SPLASH_DRAIN_MS"
        :phase="handoff.state.phase === 'SETTLING' ? 'DRAIN' : 'HOLD'"
        @drain-complete="handleSplashDrained"
      />

      <div class="matched-pr-handoff__stage">
        <div
          ref="cardShellRef"
          class="matched-pr-handoff__card-shell"
          :class="{
            'matched-pr-handoff__card-shell--flip-running':
              cardAlignmentStage === 'RUNNING',
          }"
          :style="cardShellStyle"
        >
          <PRFactsCard
            v-if="handoff.state.prId !== null"
            class="matched-pr-handoff__card"
            :pr-id="handoff.state.prId"
            :interactive="false"
          />

          <PRJoinAction
            v-if="handoff.state.phase === 'PREVIEW' && handoff.state.prId !== null"
            :pr-id="handoff.state.prId"
            :event-id="handoff.state.eventId"
            entry-surface="form_mode_matched"
            @success-closed="handleJoinSuccessClosed"
          >
            <template #trigger="{ open, pending, disabled, joined, errorMessage }">
              <div class="matched-pr-handoff__actions">
                <PuButton

                  tone="neutral" variant="soft"
                  block
                  data-testid="anchor-event-form-mode.matched.cancel"
                  :disabled="pending"
                  @click="handleCancel"
                >
                  {{ t("common.cancel") }}
                </PuButton>
                <PuButton

                  block
                  data-testid="anchor-event-form-mode.matched.join"
                  :loading="pending"
                  :disabled="disabled"
                  @click="handleConfirm(open)"
                >
                  {{
                    joined
                      ? t("prPage.partnerSection.rosterJoined")
                      : t("prPage.join")
                  }}
                </PuButton>
              </div>
              <p
                v-if="errorMessage"
                class="matched-pr-handoff__error"
              >
                {{ errorMessage }}
              </p>
            </template>
          </PRJoinAction>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import PRFactsCard from "@/domains/pr/ui/composites/PRFactsCard.vue";
import PRJoinAction from "@/domains/pr/ui/sections/PRJoinAction.vue";
import { prDetailPath } from "@/domains/pr/routing/routes";
import { trackEvent } from "@/shared/telemetry/track";
import LiquidWaveSplash from "@/processes/route-handoff/LiquidWaveSplash.vue";
import {
  useMatchedPRHandoff,
  type RouteHandoffRect,
} from "@/processes/route-handoff/useMatchedPRHandoff";
import { PuButton } from "@partner-up-dev/design-web";

const handoff = useMatchedPRHandoff();
const router = useRouter();
const { t } = useI18n();
const MATCHED_CARD_ALIGN_MS = 820;
const MATCHED_SPLASH_DRAIN_MS = 980;

let alignTimeoutId: number | null = null;
let settleTimeoutId: number | null = null;
let alignFrameId: number | null = null;

type CardAlignmentStage = "IDLE" | "INVERTED" | "RUNNING" | "SETTLED";

const cardShellRef = ref<HTMLElement | null>(null);
const cardAlignmentStage = ref<CardAlignmentStage>("IDLE");
const cardFlipTransform = ref("translate3d(0, 0, 0) scale(1) rotateY(0deg)");

const isVisible = computed(
  () => handoff.state.phase !== "IDLE" && handoff.state.prId !== null,
);

const cardShellStyle = computed(() => {
  const targetRect = handoff.state.targetRect;
  if (
    targetRect &&
    (handoff.state.phase === "ALIGNING" || handoff.state.phase === "SETTLING")
  ) {
    return {
      left: `${targetRect.left}px`,
      top: `${targetRect.top}px`,
      width: `${targetRect.width}px`,
      transform: cardFlipTransform.value,
    };
  }

  return {
    left: "50%",
    top: "50%",
    width: "min(calc(100vw - 2rem), 430px)",
    transform: "translate(-50%, -50%)",
  };
});

const clearTimers = () => {
  if (typeof window === "undefined") {
    alignTimeoutId = null;
    settleTimeoutId = null;
    return;
  }
  if (alignTimeoutId !== null) {
    window.clearTimeout(alignTimeoutId);
    alignTimeoutId = null;
  }
  if (settleTimeoutId !== null) {
    window.clearTimeout(settleTimeoutId);
    settleTimeoutId = null;
  }
};

const clearAnimationFrame = () => {
  if (typeof window === "undefined") {
    alignFrameId = null;
    return;
  }
  if (alignFrameId !== null) {
    window.cancelAnimationFrame(alignFrameId);
    alignFrameId = null;
  }
};

const resetCardAlignment = () => {
  clearAnimationFrame();
  cardAlignmentStage.value = "IDLE";
  cardFlipTransform.value = "translate3d(0, 0, 0) scale(1) rotateY(0deg)";
};

const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined") {
    return true;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

const toRouteHandoffRect = (rect: DOMRect): RouteHandoffRect => ({
  left: rect.left,
  top: rect.top,
  right: rect.right,
  bottom: rect.bottom,
  width: rect.width,
  height: rect.height,
});

const buildInvertedCardTransform = (
  sourceRect: RouteHandoffRect,
  targetRect: RouteHandoffRect,
): string => {
  const sourceCenterX = sourceRect.left + sourceRect.width / 2;
  const sourceCenterY = sourceRect.top + sourceRect.height / 2;
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;
  const deltaX = sourceCenterX - targetCenterX;
  const deltaY = sourceCenterY - targetCenterY;
  const scaleX = sourceRect.width / Math.max(targetRect.width, 1);
  const scaleY = sourceRect.height / Math.max(targetRect.height, 1);

  return `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX}, ${scaleY}) rotateY(0deg)`;
};

const startCardAlignment = () => {
  clearTimers();
  clearAnimationFrame();

  const targetRect = handoff.state.targetRect;
  const sourceElement = cardShellRef.value;
  if (!targetRect || !sourceElement || typeof window === "undefined") {
    handoff.beginSettling();
    return;
  }

  if (prefersReducedMotion()) {
    cardFlipTransform.value = "translate3d(0, 0, 0) scale(1) rotateY(0deg)";
    cardAlignmentStage.value = "SETTLED";
    handoff.beginSettling();
    return;
  }

  const sourceRect = toRouteHandoffRect(sourceElement.getBoundingClientRect());
  cardFlipTransform.value = buildInvertedCardTransform(sourceRect, targetRect);
  cardAlignmentStage.value = "INVERTED";

  alignFrameId = window.requestAnimationFrame(() => {
    alignFrameId = null;
    cardShellRef.value?.getBoundingClientRect();
    cardAlignmentStage.value = "RUNNING";
    cardFlipTransform.value =
      "translate3d(0, 0, 0) scale(1, 1) rotateY(360deg)";
    alignTimeoutId = window.setTimeout(() => {
      cardAlignmentStage.value = "SETTLED";
      handoff.beginSettling();
      alignTimeoutId = null;
    }, MATCHED_CARD_ALIGN_MS);
  });
};

const handleCancel = () => {
  clearTimers();
  resetCardAlignment();
  handoff.cancel();
};

const handleConfirm = (open: () => Promise<void>) => {
  const prId = handoff.state.prId;
  if (prId === null) {
    return;
  }

  trackEvent("anchor_event_form_result_action_click", {
    eventId: handoff.state.eventId ?? 0,
    action: "MATCHED_JOIN",
    prId,
    candidateRank: null,
  });

  void open();
};

const handleJoinSuccessClosed = async () => {
  const prId = handoff.state.prId;
  if (prId === null) {
    return;
  }

  handoff.markNavigating();
  const query = new URLSearchParams({
    handoff: "matched_pr",
    entry: "join",
  });
  if (handoff.state.eventId !== null) {
    query.set("fromEvent", String(handoff.state.eventId));
  }
  await router.push(`${prDetailPath(prId)}?${query.toString()}`);
};

const handleSplashDrained = () => {
  if (handoff.state.phase !== "SETTLING") {
    return;
  }

  clearTimers();
  resetCardAlignment();
  handoff.finish();
};

watch(
  () => handoff.state.phase,
  (phase) => {
    if (phase !== "ALIGNING") {
      if (phase === "IDLE" || phase === "PREVIEW" || phase === "NAVIGATING") {
        resetCardAlignment();
      }
      return;
    }

    startCardAlignment();
  },
);

watch(
  () => handoff.state.phase,
  (phase) => {
    if (phase !== "SETTLING" || typeof window === "undefined") {
      return;
    }

    settleTimeoutId = window.setTimeout(() => {
      handleSplashDrained();
      settleTimeoutId = null;
    }, MATCHED_SPLASH_DRAIN_MS + 180);
  },
);

onBeforeUnmount(() => {
  clearTimers();
  resetCardAlignment();
});
</script>

<style scoped lang="scss">
@use "@partner-up-dev/design-web/styles/mixins" as mx;

.matched-pr-handoff {
  position: fixed;
  inset: 0;
  z-index: 900;
  pointer-events: auto;
}

.matched-pr-handoff__splash {
  position: absolute;
  inset: 0;
}

.matched-pr-handoff__stage {
  position: absolute;
  inset: 0;
}

.matched-pr-handoff__card-shell {
  position: fixed;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  max-width: calc(100vw - 2rem);
  transform-origin: center;
  transition: opacity 280ms ease;
  will-change: transform, opacity;
}

.matched-pr-handoff__card-shell--flip-running {
  transition:
    transform 820ms cubic-bezier(0.15, 0.86, 0.18, 1),
    opacity 280ms ease;
}

.matched-pr-handoff--preview .matched-pr-handoff__card-shell {
  animation: matched-pr-card-spin-in 760ms cubic-bezier(0.16, 0.9, 0.2, 1) both;
}

.matched-pr-handoff--settling .matched-pr-handoff__card-shell {
  opacity: 0;
}

.matched-pr-handoff__card {
  box-shadow: 0 1.25rem 4rem rgba(0, 0, 0, 0.2);
}

.matched-pr-handoff__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-small);
}

.matched-pr-handoff__error {
  margin: var(--sys-spacing-small) 0 0;
  @include mx.pu-font(support);
  color: var(--sys-color-error);
}

@keyframes matched-pr-card-spin-in {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.18) rotate(-42deg);
  }

  58% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.06) rotate(9deg);
  }

  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .matched-pr-handoff__card-shell {
    transition: none;
  }

  .matched-pr-handoff--preview .matched-pr-handoff__card-shell {
    animation: none;
  }
}
</style>
