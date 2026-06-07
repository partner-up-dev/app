<template>
  <div class="chat-window">
    <div class="chat-row">
      <div class="chat-bubble" :class="{ 'bubble-loading': !posterUrl }">
        <div class="share-card">
          <div class="share-card-text">
            <p class="share-card-title">{{ shareTitle }}</p>
            <p class="share-card-desc">{{ shareDesc }}</p>
          </div>
          <div class="share-card-thumb" :class="{ 'thumb-empty': !posterUrl }">
            <img
              v-if="posterUrl"
              :src="posterUrl"
              :alt="t('share.wechat.thumbAlt')"
              @error="$emit('imageLoadError')"
            />
            <div v-else class="thumb-placeholder">{{ thumbPlaceholder }}</div>
          </div>
        </div>
      </div>
      <div class="chat-avatar">
        <div class="avatar-circle">
          <span>{{ t("share.wechat.selfLabel") }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

interface Props {
  posterUrl: string | null;
  shareTitle: string;
  shareDesc: string;
  thumbPlaceholder: string;
}

const props = defineProps<Props>();
const { t } = useI18n();

defineEmits<{
  imageLoadError: [];
}>();
</script>

<style scoped lang="scss">
.chat-window {
  background: var(--sys-color-surface);
  padding: var(--sys-spacing-large) var(--sys-spacing-small);
}

.chat-row {
  display: flex;
  gap: var(--sys-spacing-xsmall);
  justify-content: center;
  align-items: flex-end;
}

.chat-bubble {
  max-width: 82%;
  background: var(--sys-color-surface-container-lowest);
  border-radius: var(--sys-radius-small);
  padding: var(--sys-spacing-large) var(--sys-spacing-medium);
  position: relative;

  &.bubble-loading {
    background: var(--sys-color-surface-container-highest);
  }
}

.share-card {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--sys-spacing-medium);
}

.share-card-text {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.share-card-title {
  @include mx.pu-font(section);
  color: var(--sys-color-on-surface);
  margin: 0;
}

.share-card-desc {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
  margin: 0;
}

.share-card-thumb {
  margin-top: auto;
  width: 48px;
  height: 48px;
  border-radius: var(--sys-radius-xsmall);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sys-color-surface-container-highest);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.thumb-placeholder {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

.thumb-empty {
  border-style: dashed;
}

.chat-avatar {
  flex: 0 0 auto;
}

.avatar-circle {
  width: 40px;
  height: 40px;
  border-radius: var(--sys-radius-xsmall);
  background: var(--sys-color-surface-container);
  color: var(--sys-color-on-surface);
  display: grid;
  place-items: center;
  @include mx.pu-font(support);
}
</style>
