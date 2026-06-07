<template>
  <div class="tab-bar">
    <div
      ref="tabListElement"
      class="tab-bar__list"
      role="tablist"
      :aria-label="ariaLabel"
    >
      <button
        v-for="item in items"
        :key="item.key"
        :ref="(element) => setTabButtonRef(item.key, element)"
        type="button"
        role="tab"
        class="tab-bar__tab"
        :class="[
          { 'tab-bar__tab--active': modelValue === item.key },
          item.tabClass,
        ]"
        :aria-selected="modelValue === item.key"
        :disabled="item.disabled === true"
        @click="handleSelect(item)"
      >
        {{ item.label }}
      </button>
    </div>
    <slot name="append" />
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch, type ComponentPublicInstance } from "vue";

type TabBarKey = string | number;

type TabBarItem = {
  key: TabBarKey;
  label: string;
  disabled?: boolean;
  tabClass?: string;
};

const props = defineProps<{
  items: TabBarItem[];
  modelValue: TabBarKey;
  ariaLabel?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: TabBarKey];
}>();

const tabButtons = new Map<TabBarKey, HTMLButtonElement>();
const tabListElement = ref<HTMLDivElement | null>(null);

const setTabButtonRef = (
  key: TabBarKey,
  element: Element | ComponentPublicInstance | null,
) => {
  if (element instanceof HTMLButtonElement) {
    tabButtons.set(key, element);
    return;
  }

  tabButtons.delete(key);
};

const handleSelect = (item: TabBarItem) => {
  if (item.disabled === true) return;
  emit("update:modelValue", item.key);
};

const scrollActiveTabIntoView = async () => {
  await nextTick();
  const tabList = tabListElement.value;
  const activeTab = tabButtons.get(props.modelValue);
  if (!tabList || !activeTab) {
    return;
  }

  const tabListRect = tabList.getBoundingClientRect();
  const activeTabRect = activeTab.getBoundingClientRect();
  const leftDelta = activeTabRect.left - tabListRect.left;
  const targetLeft = tabList.scrollLeft + leftDelta;
  const maxScrollLeft = Math.max(0, tabList.scrollWidth - tabList.clientWidth);
  const clampedTargetLeft = Math.min(Math.max(0, targetLeft), maxScrollLeft);

  tabList.scrollTo({
    left: clampedTargetLeft,
    behavior: "smooth",
  });
};

watch(
  () => props.modelValue,
  () => {
    void scrollActiveTabIntoView();
  },
  { immediate: true },
);

watch(
  () => props.items.map((item) => item.key),
  () => {
    void scrollActiveTabIntoView();
  },
);
</script>

<style lang="scss" scoped>
.tab-bar {
  display: flex;
  gap: var(--sys-spacing-small);
  align-items: flex-start;
  min-width: 0;
}

.tab-bar__list {
  display: flex;
  gap: var(--sys-spacing-small);
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.tab-bar__list::-webkit-scrollbar {
  display: none;
}

.tab-bar__tab {
  @include mx.pu-font(control);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sys-spacing-xsmall);
  flex-shrink: 0;
  min-height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  padding: var(--sys-spacing-small) var(--sys-spacing-medium);
  border: 1px solid var(--sys-color-outline);
  border-radius: 999px;
  background: transparent;
  color: var(--sys-color-on-surface);
  text-decoration: none;
  user-select: none;
  -webkit-user-select: none;
  cursor: pointer;
  transition:
    background-color 150ms ease,
    color 150ms ease,
    border-color 150ms ease,
    opacity 150ms ease,
    transform 150ms ease;

  &:hover:not(:disabled) {
    background: var(--sys-color-surface-container-high);
  }

  &:active:not(:disabled) {
    transform: scale(0.99);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.tab-bar__tab--active {
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
  border-color: var(--sys-color-primary);

  &:hover:not(:disabled) {
    background: var(--sys-color-primary);
  }
}

.tab-bar__tab--expired {
  border-style: dashed;
  opacity: 0.6; // TODO replace with design token
}
</style>
