<template>
  <section v-if="(hasJoined && canConfirm) || (hasJoined && canCheckIn)" class="actions">
    <PuButton
      v-if="hasJoined && canConfirm"
      class="confirm-slot-action"
      tone="primary" variant="outline"
      @click="emit('confirm-slot')"
      :disabled="confirmPending"
    >
      {{ confirmPending ? t("prPage.confirmingSlot") : t("prPage.confirmSlot") }}
    </PuButton>

    <PuButton
      v-if="hasJoined && canCheckIn"
      class="checkin-attended-action"
      tone="tertiary" variant="solid"
      @click="emit('submit-check-in')"
      :disabled="checkInPending"
    >
      {{ checkInPending ? t("prPage.checkingIn") : t("prPage.checkInAttended") }}
    </PuButton>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { PuButton } from "@partner-up-dev/design-web";

defineProps<{
  hasJoined: boolean;
  canConfirm: boolean;
  canCheckIn: boolean;
  confirmPending: boolean;
  checkInPending: boolean;
}>();

const emit = defineEmits<{
  "confirm-slot": [];
  "submit-check-in": [];
}>();

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.actions {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: var(--sys-spacing-small);
  margin-top: var(--sys-spacing-small);
}

.actions > button {
  width: 100%;
}

.confirm-slot-action,
.checkin-attended-action {
  flex: 1;
  min-width: 0;
  font-weight: 600;
}

</style>
