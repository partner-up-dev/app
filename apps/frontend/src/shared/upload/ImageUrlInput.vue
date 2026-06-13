<template>
  <div class="image-url-input">
    <input
      ref="fileInputRef"
      class="image-url-input__file"
      type="file"
      :accept="accept"
      :disabled="disabled || isUploading"
      @change="handleFileChange"
    />

    <div
      class="image-url-input__row"
      :class="{ 'image-url-input__row--upload-only': !allowUrlInput }"
    >
      <PuInput
        v-if="allowUrlInput"
        :id="inputId"
        type="url"
        inputmode="url"
        :model-value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        @update:model-value="handleUrlInput"
      />
      <PuButton
        shape="pill"
        tone="neutral" variant="outline"
        size="sm"

        :disabled="disabled || isUploading"
        :loading="isUploading"
        @click="handlePickImage"
      >
        {{ isUploading ? uploadingLabel : uploadLabel }}
      </PuButton>
    </div>

    <img
      v-if="previewUrl"
      class="image-url-input__preview"
      :src="previewUrl"
      :alt="previewAlt"
    />

    <p v-if="uploadError" class="image-url-input__error">
      {{ uploadError }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { ImageUploadPurpose } from "@partner-up-dev/backend";
import { useCloudStorage } from "@/shared/upload/useCloudStorage";
import { PuButton, PuInput } from "@partner-up-dev/design-web";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    inputId: string;
    purpose: ImageUploadPurpose;
    placeholder?: string;
    uploadLabel: string;
    uploadingLabel: string;
    previewAlt: string;
    accept?: string;
    disabled?: boolean;
    uploading?: boolean;
    allowUrlInput?: boolean;
  }>(),
  {
    placeholder: "",
    accept: "image/png,image/jpeg,image/webp",
    disabled: false,
    uploading: false,
    allowUrlInput: true,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  "update:uploading": [value: boolean];
  uploaded: [url: string];
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const { uploadImage, isUploading, uploadError, clearError } = useCloudStorage();

const previewUrl = computed(() => {
  const normalized = props.modelValue.trim();
  return normalized.length > 0 ? normalized : null;
});

watch(
  isUploading,
  (value) => {
    emit("update:uploading", value);
  },
  { immediate: true },
);

const handlePickImage = () => {
  fileInputRef.value?.click();
};

const handleUrlInput = (value: string) => {
  emit("update:modelValue", value);
  clearError();
};

const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  const file = input?.files?.[0] ?? null;
  if (!file) {
    return;
  }

  try {
    const url = await uploadImage(file, { purpose: props.purpose });
    emit("update:modelValue", url);
    emit("uploaded", url);
  } finally {
    if (input) {
      input.value = "";
    }
  }
};
</script>

<style lang="scss" scoped>
.image-url-input {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.image-url-input__file {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.image-url-input__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--sys-spacing-small);
  align-items: center;
}

.image-url-input__row--upload-only {
  grid-template-columns: minmax(0, 1fr);
}

.image-url-input__preview {
  width: min(100%, 240px);
  aspect-ratio: 4 / 3;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  object-fit: cover;
  background: var(--sys-color-surface-container-low);
}

.image-url-input__error {
  margin: 0;
  color: var(--sys-color-error);
  @include mx.pu-font(support);
}

@media (max-width: 560px) {
  .image-url-input__row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
