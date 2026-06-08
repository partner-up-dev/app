<template>
  <section v-if="(hasJoined && canConfirm) || (hasJoined && canCheckIn)" class="actions">
    <Button
      v-if="hasJoined && canConfirm"
      class="confirm-slot-action"
      tone="primary-outline"
      @click="emit('confirm-slot')"
      :disabled="confirmPending"
    >
      {{ confirmPending ? t("prPage.confirmingSlot") : t("prPage.confirmSlot") }}
    </Button>

    <Button
      v-if="hasJoined && canCheckIn"
      class="checkin-attended-action"
      tone="tertiary"
      @click="emit('submit-check-in')"
      :disabled="checkInPending"
    >
      {{ checkInPending ? t("prPage.checkingIn") : t("prPage.checkInAttended") }}
    </Button>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Button from "@/shared/ui/actions/Button.vue";

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
