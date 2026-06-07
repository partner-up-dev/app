<template>
  <Modal :open="open" :title="title" :max-width="maxWidth" @close="$emit('close')">
    <div class="confirm-dialog">
      <slot>
        <p v-if="message" class="confirm-dialog__message">{{ message }}</p>
        <p v-if="description" class="confirm-dialog__description">
          {{ description }}
        </p>
      </slot>

      <div class="confirm-dialog__actions">
        <Button
          type="button"
          appearance="rect"
          tone="outline"
          block
          @click="$emit('close')"
        >
          {{ cancelLabelText }}
        </Button>
        <Button
          type="button"
          appearance="rect"
          :tone="confirmTone"
          :loading="loading"
          :disabled="disabled"
          block
          @click="$emit('confirm')"
        >
          {{ confirmLabelText }}
        </Button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Button from "@/shared/ui/actions/Button.vue";
import Modal from "@/shared/ui/overlay/Modal.vue";

type ConfirmTone = "primary" | "danger" | "secondary";

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    message?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmTone?: ConfirmTone;
    loading?: boolean;
    disabled?: boolean;
    maxWidth?: string;
  }>(),
  {
    message: undefined,
    description: undefined,
    confirmLabel: undefined,
    cancelLabel: undefined,
    confirmTone: "primary",
    loading: false,
    disabled: false,
    maxWidth: "420px",
  },
);

defineEmits<{
  close: [];
  confirm: [];
}>();

const { t } = useI18n();

const confirmLabelText = computed(() => props.confirmLabel ?? t("common.confirm"));
const cancelLabelText = computed(() => props.cancelLabel ?? t("common.cancel"));
</script>

<style lang="scss" scoped>
.confirm-dialog {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-large);
}

.confirm-dialog__message,
.confirm-dialog__description {
  margin: 0;
}

.confirm-dialog__message {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface);
}

.confirm-dialog__description {
  @include mx.pu-font(support);
  color: var(--sys-color-on-surface-variant);
}

.confirm-dialog__actions {
  display: flex;
  gap: var(--sys-spacing-small);
}

.confirm-dialog__actions :deep(.ui-button) {
  flex: 1;
  min-width: 0;
}

@media (max-width: 640px) {
  .confirm-dialog__actions {
    flex-direction: column;
  }
}
</style>
