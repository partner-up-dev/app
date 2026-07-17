<template>
  <section v-if="slotStateText" class="slot-state">
    <p class="slot-state-text">{{ slotStateText }}</p>
  </section>

  <section
    v-if="canJoin || canExit || showEditContentAction || showModifyStatusAction"
    class="actions"
  >
    <PuButton v-if="canJoin" :disabled="joinPending" @click="emit('join')">
      {{ joinPending ? t("prPage.joining") : t("prPage.join") }}
    </PuButton>

    <PuButton
      v-if="canExit"
      tone="danger"
      variant="outline"
      :disabled="exitPending"
      @click="emit('exit')"
    >
      {{ exitPending ? t("prPage.exiting") : t("prPage.exit") }}
    </PuButton>

    <PuButton
      v-if="showEditContentAction"
      tone="neutral"
      variant="soft"
      @click="emit('edit-content')"
    >
      {{ t("prPage.editContent") }}
    </PuButton>

    <PuButton
      v-if="showModifyStatusAction"
      tone="neutral"
      variant="soft"
      @click="emit('modify-status')"
    >
      {{ t("prPage.modifyStatus") }}
    </PuButton>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { PuButton } from "@partner-up-dev/design-web";

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
