<template>
  <section class="value-props" aria-labelledby="home-value-props-title">
    <h2 id="home-value-props-title" :class="{ 'is-visible': props.startReveal }">
      {{ t("home.landing.valuePropsTitle") }}
    </h2>
    <ol class="value-list">
      <li
        class="value-item"
        :class="{ 'is-visible': props.startReveal }"
        :style="{ transitionDelay: '0ms' }"
      >
        <button
          class="value-link value-trigger"
          type="button"
          :aria-expanded="showNLForm"
          :aria-controls="HOME_NL_PANEL_ID"
          @click="toggleNLForm"
        >
          <span class="value-order" aria-hidden="true">{{ firstValueItem.order }}</span>
          <span class="value-text-wrap">
            <span class="value-icon" :class="firstValueItem.icon" aria-hidden="true"></span>
            <span class="value-text">{{ t(firstValueItem.key) }}</span>
          </span>
          <span
            class="i-mdi-chevron-down value-arrow"
            :class="{ 'is-expanded': showNLForm }"
            aria-hidden="true"
          ></span>
        </button>

        <Transition name="value-panel-expand">
          <div v-if="showNLForm" :id="HOME_NL_PANEL_ID" class="value-panel">
            <InlineNLPRForm />
          </div>
        </Transition>
      </li>

      <li
        v-for="(item, index) in passiveValueItems"
        :key="item.key"
        class="value-item"
        :class="{ 'is-visible': props.startReveal }"
        :style="{ transitionDelay: `${(index + 1) * 130}ms` }"
      >
        <div class="value-link value-link--static">
          <span class="value-order" aria-hidden="true">{{ item.order }}</span>
          <span class="value-text-wrap">
            <span class="value-icon" :class="item.icon" aria-hidden="true"></span>
            <span class="value-text">{{ t(item.key) }}</span>
          </span>
        </div>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import InlineNLPRForm from "@/domains/pr/ui/sections/InlineNLPRForm.vue";

const { t } = useI18n();
const props = withDefaults(
  defineProps<{
    startReveal?: boolean;
  }>(),
  {
    startReveal: false,
  },
);

const HOME_NL_PANEL_ID = "home-nl-pr-form-panel";

const firstValueItem = {
  order: "01",
  key: "home.landing.valueProps.item1",
  icon: "i-mdi-message-text-fast-outline",
};

const showNLForm = ref(false);

const toggleNLForm = () => {
  showNLForm.value = !showNLForm.value;
};

const passiveValueItems = computed(() => [
  {
    order: "02",
    key: "home.landing.valueProps.item2",
    icon: "i-mdi-share-variant-outline",
  },
  {
    order: "03",
    key: "home.landing.valueProps.item3",
    icon: "i-mdi-account-group-outline",
  },
]);
</script>

<style lang="scss" scoped>
.value-props {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

h2 {
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--sys-color-on-surface-variant);
  opacity: 0;
  transform: translate3d(0, 0.4rem, 0);
  transition:
    opacity 300ms ease,
    transform 300ms ease;
}

h2.is-visible {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.value-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  padding: 0;
  margin: 0;
}

.value-item {
  padding: 0;
  border-bottom: 1px dashed var(--sys-color-outline-variant);
  opacity: 0;
  transform: translate3d(0, 0.72rem, 0);
  transition:
    opacity 320ms ease,
    transform 320ms ease;
}

.value-item.is-visible {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.value-link {
  padding: var(--sys-spacing-small) var(--sys-spacing-medium);
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-small);
  transition:
    opacity 180ms ease,
    transform 180ms ease;
  color: var(--sys-color-on-surface);
}

.value-trigger {
  cursor: pointer;

  &:hover {
    opacity: 0.84;
  }

  &:active {
    opacity: 0.68;
    transform: scale(0.995);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 3px;
  }
}

.value-link--static {
  cursor: default;
}

.value-order {
  font-size: 1.125rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--sys-color-on-surface-variant);
  min-width: 2.5ch;
}

.value-text-wrap {
  display: inline-flex;
  align-items: center;
  gap: var(--sys-spacing-small);
}

.value-icon {
  @include mx.pu-icon(small, true);
  color: var(--sys-color-on-surface-variant);
  flex-shrink: 0;
}

.value-text {
  font-size: 1.125rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--sys-color-on-surface);
}

.value-arrow {
  @include mx.pu-icon(medium, true);
  margin-left: auto;
  color: var(--sys-color-on-primary-container);
  transition: transform 220ms ease;
}

.value-arrow.is-expanded {
  transform: rotate(180deg);
}

.value-panel {
  overflow: hidden;
  padding: 0 var(--sys-spacing-medium) var(--sys-spacing-medium);
  margin-top: calc(var(--sys-spacing-xsmall) * -1);
}

.value-panel-expand-enter-active,
.value-panel-expand-leave-active {
  transition:
    max-height 280ms ease,
    opacity 220ms ease,
    transform 220ms ease;
}

.value-panel-expand-enter-from,
.value-panel-expand-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-8px);
}

.value-panel-expand-enter-to,
.value-panel-expand-leave-from {
  max-height: var(--landing-value-panel-max-height);
  opacity: 1;
  transform: translateY(0);
}

@media (max-width: 768px) {
  .value-props {
    gap: var(--landing-hero-gap-compact);
  }

  h2 {
    font-size: 1.125rem;
    letter-spacing: 0.05em;
  }

  .value-list {
    gap: var(--sys-spacing-small);
  }

  .value-link {
    padding: var(--sys-spacing-small) var(--sys-spacing-medium);
  }

  .value-order {
    font-size: 1.375rem;
    line-height: 2rem;
  }

  .value-icon {
    @include mx.pu-icon(medium, true);
  }

  .value-text {
    font-size: 1rem;
    line-height: 1.5;
  }

  .value-panel {
    padding-bottom: var(--sys-spacing-small);
  }
}

@media (prefers-reduced-motion: reduce) {
  h2,
  .value-item,
  .value-link,
  .value-arrow,
  .value-panel-expand-enter-active,
  .value-panel-expand-leave-active {
    animation: none !important;
    transition: none !important;
  }
}
</style>
