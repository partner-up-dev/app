<template>
  <header class="page-header">
    <button
      class="home-btn"
      @click="emit('back')"
      :aria-label="t('common.backToHome')"
    >
      <div class="i-mdi-arrow-left font-title-large"></div>
    </button>
    <h1>{{ t("createPage.title") }}</h1>
  </header>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const emit = defineEmits<{
  back: [];
}>();

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-small);
  margin-bottom: var(--sys-spacing-medium);

  h1 {
    @include mx.pu-font(title);
    color: var(--sys-color-on-surface);
    margin: 0;
  }
}

.home-btn {
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

  &:hover {
    background: var(--sys-color-surface-container);
  }
}
</style>
