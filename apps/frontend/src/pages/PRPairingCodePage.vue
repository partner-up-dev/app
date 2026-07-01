<template>
  <main
    v-if="showPairingCode"
    class="pairing-code-page"
    data-page="pr-pairing-code"
    :aria-label="t('prPage.pairingCodePage.title')"
    :style="pairingPageStyle"
  >
    <button
      class="pairing-code-page__back"
      type="button"
      :aria-label="t('prPage.pairingCodePage.backToDetail')"
      data-testid="pr-pairing-code.back"
      @click="handleBack"
    >
      <span class="i-mdi-arrow-left" aria-hidden="true"></span>
    </button>

    <div
      class="pairing-code-page__code"
      data-testid="pr-pairing-code.code"
      aria-live="polite"
    >
      {{ pairingCode }}
    </div>
  </main>

  <main
    v-else
    class="pairing-code-page pairing-code-page--fallback"
    data-page="pr-pairing-code"
  >
    <PuLoadingState v-if="isLoading" :message="t('common.loading')" />
    <PuInlineNotice tone="error"
      v-else-if="error"
      :message="error.message"
    />
    <PuInlineNotice tone="error"
      v-else
      :message="t('prPage.pairingCodePage.unavailable')"
    />
  </main>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { usePRDetail } from "@/domains/pr/queries/usePRDetail";
import { usePRRouteId } from "@/domains/pr/routing/usePRRouteId";
import { prDetailPath } from "@/domains/pr/routing/routes";
import { PuInlineNotice, PuLoadingState } from "@partner-up-dev/design-web";
import {
  canShowPRPairingCode,
  derivePRPairingIdentity,
} from "@/domains/pr/model/pr-pairing-code";

const router = useRouter();
const { t } = useI18n();
const id = usePRRouteId();
const { data, isLoading, error } = usePRDetail(id);

const prDetail = computed(() => data.value);
const showPairingCode = computed(() => {
  const pr = prDetail.value;
  return pr ? canShowPRPairingCode(pr) : false;
});
const pairingIdentity = computed(() => {
  const pr = prDetail.value;
  return pr ? derivePRPairingIdentity(pr.id) : null;
});
const pairingCode = computed(() => pairingIdentity.value?.code ?? "");
const pairingPageStyle = computed<CSSProperties>(() => {
  const identity = pairingIdentity.value;
  if (!identity) return {};
  return {
    backgroundColor: identity.backgroundColor,
    color: identity.foregroundColor,
  };
});

const hasRouterBackEntry = (): boolean => {
  if (typeof window === "undefined") return false;
  const historyState = window.history.state as { back?: string | null } | null;
  return typeof historyState?.back === "string" && historyState.back.length > 0;
};

const handleBack = async (): Promise<void> => {
  if (hasRouterBackEntry()) {
    router.back();
    return;
  }

  if (id.value === null) {
    await router.replace("/");
    return;
  }

  await router.replace(prDetailPath(id.value));
};
</script>

<style scoped lang="scss">
.pairing-code-page {
  display: grid;
  place-items: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding:
    max(var(--sys-spacing-medium), env(safe-area-inset-top))
    max(var(--sys-spacing-medium), env(safe-area-inset-right))
    max(var(--sys-spacing-medium), env(safe-area-inset-bottom))
    max(var(--sys-spacing-medium), env(safe-area-inset-left));
  overflow: hidden;
}

.pairing-code-page--fallback {
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}

.pairing-code-page__back {
  position: fixed;
  inset-block-start: max(var(--sys-spacing-medium), env(safe-area-inset-top));
  inset-inline-start: max(var(--sys-spacing-medium), env(safe-area-inset-left));
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  border: 1px solid currentColor;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.pairing-code-page__back span {
  @include mx.pu-icon(medium);
}

.pairing-code-page__back:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
}

.pairing-code-page__code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
  font-size: 32vw;
  font-weight: 800;
  line-height: 0.9;
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
  text-align: center;
  text-wrap: nowrap;
}

@media (orientation: landscape) {
  .pairing-code-page__code {
    font-size: 38vh;
  }
}
</style>
