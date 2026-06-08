<template>
  <header class="page-header" :class="`page-header--${variant}`">
    <div class="page-header__bar">
      <button
        v-if="showBack"
        class="page-header__back-action"
        :aria-label="backLabel"
        @click="handleBack"
      >
        <div class="i-mdi-arrow-left font-title-large"></div>
      </button>

      <h1 class="page-header__title">{{ title }}</h1>

      <slot name="top-actions" />
    </div>

    <p v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</p>

    <div v-if="$slots.meta" class="page-header__meta">
      <slot name="meta" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { getCurrentInstance } from "vue";
import { useRouter, type RouteLocationRaw } from "vue-router";

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    variant?: "default" | "small";
    showBack?: boolean;
    backLabel?: string;
    backFallbackTo?: RouteLocationRaw;
  }>(),
  {
    variant: "default",
    showBack: true,
  },
);

const emit = defineEmits<{
  (e: "back"): void;
}>();

const { t } = useI18n();
const router = useRouter();
const defaultBackFallbackTo: RouteLocationRaw = { path: "/" };
const instance = getCurrentInstance();
type RouterHistoryState = {
  back?: string | null;
};

const backLabel = props.backLabel ?? t("common.backToHome");

const hasRouterBackEntry = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const historyState = window.history.state as RouterHistoryState | null;
  return typeof historyState?.back === "string" && historyState.back.length > 0;
};

const resolveBackFallbackTo = (): RouteLocationRaw =>
  props.backFallbackTo ?? defaultBackFallbackTo;

async function handleBack(): Promise<void> {
  const hasListener =
    !!instance?.vnode.props &&
    ((instance.vnode.props as Record<string, unknown>)["onBack"] ||
      (instance.vnode.props as Record<string, unknown>)["onBack"] === null);

  if (hasListener) {
    emit("back");
    return;
  }

  if (hasRouterBackEntry()) {
    router.back();
    return;
  }

  await router.replace(resolveBackFallbackTo());
}
</script>

<style lang="scss" scoped>
.page-header {
  margin-bottom: var(--sys-spacing-medium);
}

.page-header--small {
  margin-bottom: var(--sys-spacing-small);
}

.page-header__bar {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-small);
  min-width: 0;
  margin-bottom: var(--sys-spacing-small);
}

.page-header__back-action {
  display: flex;
  background: transparent;
  border: none;
  color: var(--sys-color-on-surface);
  cursor: pointer;
  min-width: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  min-height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  border-radius: 999px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover {
    background: var(--sys-color-surface-container);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.page-header__title {
  @include mx.pu-font(hero);
  color: var(--sys-color-on-surface);
  margin: 0;
  flex: 1;
  min-width: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.page-header--small .page-header__title {
  @include mx.pu-font(title);
  -webkit-line-clamp: 1;
}

.page-header__subtitle {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
  margin: 0;
}

.page-header--small .page-header__subtitle {
  @include mx.pu-font(control);
}

.page-header__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--sys-spacing-small);
  gap: var(--sys-spacing-small);
}

.page-header__meta--vertical {
  flex-direction: column;
  align-items: flex-start;
}
</style>
