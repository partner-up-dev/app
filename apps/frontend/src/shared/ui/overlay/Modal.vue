<template>
  <Teleport to="body">
    <div v-if="open" class="modal-overlay" @click.self="handleClose">
      <div class="modal" :style="{ maxWidth }">
        <slot name="header">
          <h3 v-if="title" class="modal-title">{{ title }}</h3>
        </slot>
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch } from "vue";

interface Props {
  open: boolean;
  maxWidth?: string;
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  maxWidth: "480px",
  title: undefined,
});

const emit = defineEmits<{
  close: [];
}>();

const handleClose = (): void => {
  emit("close");
};

const handleEscape = (e: KeyboardEvent): void => {
  if (e.key === "Escape" && props.open) {
    handleClose();
  }
};

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    } else {
      document.removeEventListener("keydown", handleEscape);
    }
  },
);

onMounted(() => {
  if (props.open) {
    document.addEventListener("keydown", handleEscape);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", handleEscape);
});
</script>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--sys-spacing-medium) + var(--pu-safe-top))
    calc(var(--sys-spacing-medium) + var(--pu-safe-right))
    calc(var(--sys-spacing-medium) + var(--pu-safe-bottom))
    calc(var(--sys-spacing-medium) + var(--pu-safe-left));
  z-index: 1000;
}

.modal {
  background: var(--sys-color-surface);
  border-radius: var(--sys-radius-large);
  padding: var(--sys-spacing-large);
  width: 100%;
  max-height: calc(
    var(--pu-vh) -
      (2 * var(--sys-spacing-medium)) - var(--pu-safe-top) - var(--pu-safe-bottom)
  );
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.modal-title {
  @include mx.pu-font(title);
  margin-bottom: var(--sys-spacing-medium);
}
</style>
