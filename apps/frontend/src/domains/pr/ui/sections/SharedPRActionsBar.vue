<template>
  <section v-if="slotStateText" class="slot-state">
    <p class="slot-state-text">{{ slotStateText }}</p>
  </section>

  <section
    v-if="canJoin || canExit || showEditContentAction || showModifyStatusAction"
    class="actions"
  >
    <Button
      v-if="canJoin"
      type="button"
      :disabled="joinPending"
      @click="emit('join')"
    >
      {{ joinPending ? t("prPage.joining") : t("prPage.join") }}
    </Button>

    <Button
      v-if="canExit"
      tone="danger"
      type="button"
      :disabled="exitPending"
      @click="emit('exit')"
    >
      {{ exitPending ? t("prPage.exiting") : t("prPage.exit") }}
    </Button>

    <Button
      v-if="showEditContentAction"
      tone="surface"
      type="button"
      @click="emit('edit-content')"
    >
      {{ t("prPage.editContent") }}
    </Button>

    <Button
      v-if="showModifyStatusAction"
      tone="surface"
      type="button"
      @click="emit('modify-status')"
    >
      {{ t("prPage.modifyStatus") }}
    </Button>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Button from "@/shared/ui/actions/Button.vue";

defineProps<{
  canJoin: boolean;
  canExit: boolean;
  hasJoined: boolean;
  isCreator: boolean;
  showEditContentAction: boolean;
  showModifyStatusAction: boolean;
  slotStateText?: string;
  joinPending: boolean;
  exitPending: boolean;
}>();

const emit = defineEmits<{
  join: [];
  exit: [];
  "edit-content": [];
  "modify-status": [];
}>();

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.slot-state {
  margin-top: var(--sys-spacing-medium);
}

.slot-state-text {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-small);
  margin-top: var(--sys-spacing-large);
}

.actions > button {
  width: 100%;
}

.actions > button {
  flex: 1;
  min-width: 0;
}

@include mx.breakpoint(md) {
  .actions > button {
    width: auto;
  }
}
</style>
