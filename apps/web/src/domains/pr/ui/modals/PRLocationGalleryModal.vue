<template>
  <PuModal
    :open="open"
    :title="title ?? t('prCard.locationGallery.title')"
    max-width="560px"
    @close="emit('close')"
  >
    <div class="location-gallery-modal">
      <p v-if="images.length === 0" class="empty-text">
        {{ t("prCard.locationGallery.empty") }}
      </p>

      <template v-else>
        <img
          class="preview-image"
          :src="images[currentIndex]"
          :alt="
            t('prCard.locationGallery.imageAlt', { index: currentIndex + 1 })
          "
        />

        <div class="controls">
          <PuButton
            shape="pill"
            size="sm"

            :disabled="images.length <= 1"
            @click="goPrev"
          >
            {{ t("prCard.locationGallery.prev") }}
          </PuButton>

          <span class="counter">
            {{
              t("prCard.locationGallery.counter", {
                current: currentIndex + 1,
                total: images.length,
              })
            }}
          </span>

          <PuButton
            shape="pill"
            size="sm"

            :disabled="images.length <= 1"
            @click="goNext"
          >
            {{ t("prCard.locationGallery.next") }}
          </PuButton>
        </div>
      </template>
    </div>
  </PuModal>
</template>

<script setup lang="ts">
import { PuButton, PuModal } from "@partner-up-dev/design-web";
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";

interface PRLocationGalleryModalProps {
  open: boolean;
  images: string[];
  title?: string;
}

const props = defineProps<PRLocationGalleryModalProps>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();
const currentIndex = ref(0);

const goPrev = () => {
  if (props.images.length <= 1) return;
  currentIndex.value =
    (currentIndex.value - 1 + props.images.length) % props.images.length;
};

const goNext = () => {
  if (props.images.length <= 1) return;
  currentIndex.value = (currentIndex.value + 1) % props.images.length;
};

watch(
  () => [props.open, props.images] as const,
  () => {
    currentIndex.value = 0;
  },
);
</script>

<style lang="scss" scoped>
.location-gallery-modal {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.empty-text {
  @include mx.pu-font(body);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

.preview-image {
  width: 100%;
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface-container);
  object-fit: cover;
  aspect-ratio: 4 / 3;
}

.controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
}

.counter {
  @include mx.pu-font(support);
  color: var(--sys-color-on-surface-variant);
}
</style>
