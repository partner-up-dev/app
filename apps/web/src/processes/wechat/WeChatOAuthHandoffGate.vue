<template>
  <slot v-if="ready" />

  <main v-else class="wechat-oauth-handoff" aria-live="polite">
    <section class="wechat-oauth-handoff__body" aria-busy="true">
      <div v-if="state !== 'failed'" class="wechat-oauth-handoff__spinner" aria-hidden="true"></div>
      <div v-else class="wechat-oauth-handoff__mark" aria-hidden="true">!</div>

      <p class="wechat-oauth-handoff__eyebrow">微信登录</p>
      <h1 class="wechat-oauth-handoff__title">{{ title }}</h1>
      <p class="wechat-oauth-handoff__description">{{ description }}</p>

      <div v-if="state !== 'loading'" class="wechat-oauth-handoff__actions">
        <PuButton v-if="state === 'failed'" tone="primary" variant="solid" @click="retry">
          重新尝试
        </PuButton>
        <PuButton tone="neutral" variant="soft" @click="continueAsGuest"> 先以访客浏览 </PuButton>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ensureAuthSessionBootstrapped } from "@/processes/auth/useAuthSessionBootstrap";
import {
  clearWeChatOAuthHandoffFromAddressBar,
  consumeWeChatOAuthHandoff,
  hasPendingWeChatOAuthHandoff,
  WECHAT_OAUTH_HANDOFF_QUERY_PARAM,
} from "@/processes/wechat/oauth-handoff";
import { clearWeChatOAuthLoginPending } from "@/processes/wechat/oauth-login-pending";
import { clearWeChatOAuthTrace, trackWeChatOAuthTrace } from "@/processes/wechat/oauth-trace";
import { PuButton } from "@partner-up-dev/design-web";

const HANDOFF_SLOW_THRESHOLD_MS = 8_000;

type HandoffGateState = "loading" | "slow" | "failed";

const ready = ref(!hasPendingWeChatOAuthHandoff());
const state = ref<HandoffGateState>("loading");
const route = useRoute();
const router = useRouter();

let attemptId = 0;
let slowTimer: ReturnType<typeof setTimeout> | null = null;
let abortController: AbortController | null = null;

const title = computed(() => {
  if (state.value === "slow") return "微信登录还在确认";
  if (state.value === "failed") return "微信登录没有完成";
  return "正在完成微信登录";
});

const description = computed(() => {
  if (state.value === "slow") {
    return "当前连接比平常久，可以继续等待，或先以访客状态浏览。";
  }
  if (state.value === "failed") {
    return "可能是登录凭证过期或网络中断，请重新尝试。";
  }
  return "请稍候，不需要刷新页面。";
});

const clearSlowTimer = (): void => {
  if (!slowTimer) return;
  clearTimeout(slowTimer);
  slowTimer = null;
};

const stopPendingRequest = (): void => {
  clearSlowTimer();
  abortController?.abort();
  abortController = null;
};

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === "AbortError";

const completeHandoff = (): void => {
  ready.value = true;
  void ensureAuthSessionBootstrapped();
};

const clearHandoffRoute = async (): Promise<void> => {
  clearWeChatOAuthHandoffFromAddressBar();

  if (!(WECHAT_OAUTH_HANDOFF_QUERY_PARAM in route.query)) {
    return;
  }

  const query = { ...route.query };
  delete query[WECHAT_OAUTH_HANDOFF_QUERY_PARAM];

  await router
    .replace({
      path: route.path,
      query,
      hash: route.hash,
    })
    .catch(() => undefined);
};

const runHandoff = async (): Promise<void> => {
  const currentAttemptId = attemptId + 1;
  attemptId = currentAttemptId;

  if (!hasPendingWeChatOAuthHandoff()) {
    completeHandoff();
    return;
  }

  stopPendingRequest();
  state.value = "loading";

  const controller = new AbortController();
  abortController = controller;
  const handoffStartedAtMs = Date.now();
  trackWeChatOAuthTrace("handoff_started", { attempt: currentAttemptId });
  slowTimer = setTimeout(() => {
    if (attemptId === currentAttemptId && !ready.value) {
      state.value = "slow";
      trackWeChatOAuthTrace("handoff_slow", {
        attempt: currentAttemptId,
        durationMs: Date.now() - handoffStartedAtMs,
        result: "slow",
      });
    }
  }, HANDOFF_SLOW_THRESHOLD_MS);

  try {
    const result = await consumeWeChatOAuthHandoff({
      signal: controller.signal,
    });
    if (attemptId !== currentAttemptId) return;

    clearSlowTimer();
    abortController = null;

    if (result.consumed) {
      trackWeChatOAuthTrace("handoff_completed", {
        attempt: currentAttemptId,
        durationMs: Date.now() - handoffStartedAtMs,
        result: "success",
      });
      await clearHandoffRoute();
      clearWeChatOAuthTrace();
      completeHandoff();
      return;
    }

    clearWeChatOAuthLoginPending();
    trackWeChatOAuthTrace("handoff_failed", {
      attempt: currentAttemptId,
      durationMs: Date.now() - handoffStartedAtMs,
      result: "failure",
      failureReason: "not_consumed",
    });
    state.value = "failed";
  } catch (error) {
    if (attemptId !== currentAttemptId) return;

    clearSlowTimer();
    abortController = null;

    if (isAbortError(error)) {
      return;
    }

    clearWeChatOAuthLoginPending();
    trackWeChatOAuthTrace("handoff_failed", {
      attempt: currentAttemptId,
      durationMs: Date.now() - handoffStartedAtMs,
      result: "failure",
      failureReason: error instanceof Error ? error.name : "unknown_error",
    });
    state.value = "failed";
  }
};

const retry = (): void => {
  void runHandoff();
};

const continueAsGuest = async (): Promise<void> => {
  attemptId += 1;
  stopPendingRequest();
  clearWeChatOAuthLoginPending();
  trackWeChatOAuthTrace("handoff_abandoned", {
    result: "abandoned",
  });
  await clearHandoffRoute();
  clearWeChatOAuthTrace();
  completeHandoff();
};

onMounted(() => {
  if (!ready.value) {
    void runHandoff();
  }
});

onBeforeUnmount(() => {
  attemptId += 1;
  stopPendingRequest();
});
</script>

<style lang="scss" scoped>
@use "@partner-up-dev/design-web/styles/mixins" as mx;

.wechat-oauth-handoff {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: var(--pu-vh);
  padding: var(--sys-spacing-large) var(--sys-spacing-medium);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}

.wechat-oauth-handoff__body {
  display: flex;
  width: min(100%, calc(calc(var(--sys-spacing-large) * 2) * 6));
  flex-direction: column;
  align-items: center;
  gap: var(--sys-spacing-small);
  text-align: center;
}

.wechat-oauth-handoff__spinner,
.wechat-oauth-handoff__mark {
  width: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  margin-bottom: var(--sys-spacing-small);
  border-radius: 50%;
}

.wechat-oauth-handoff__spinner {
  border: 3px solid var(--sys-color-outline-variant);
  border-top-color: var(--sys-color-primary);
  animation: wechat-oauth-handoff-spin 0.8s linear infinite;
}

.wechat-oauth-handoff__mark {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sys-color-error-container);
  color: var(--sys-color-on-error-container);

  @include mx.pu-font(section);
}

.wechat-oauth-handoff__eyebrow {
  color: var(--sys-color-primary);

  @include mx.pu-font(control);
}

.wechat-oauth-handoff__title {
  max-width: 100%;
  color: var(--sys-color-on-surface);

  @include mx.pu-font(title);
}

.wechat-oauth-handoff__description {
  max-width: 100%;
  color: var(--sys-color-on-surface-variant);

  @include mx.pu-font(body);
}

.wechat-oauth-handoff__actions {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--sys-spacing-small);
  margin-top: var(--sys-spacing-medium);
}

@media (prefers-reduced-motion: reduce) {
  .wechat-oauth-handoff__spinner {
    animation: none;
  }
}

@keyframes wechat-oauth-handoff-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
