<template>
  <SharedPRActionsBar
    :can-join="canJoin"
    :can-exit="canExit"
    :has-joined="hasJoined"
    :is-creator="isCreator"
    :show-edit-content-action="showEditContentAction"
    :show-modify-status-action="showModifyStatusAction"
    :slot-state-text="slotStateText"
    :join-pending="joinPending"
    :exit-pending="exitPending"
    @join="emit('join')"
    @exit="emit('exit')"
    @edit-content="emit('edit-content')"
    @modify-status="emit('modify-status')"
  />

  <AnchorAttendancePanel
    :has-joined="hasJoined"
    :can-confirm="canConfirm"
    :can-check-in="canCheckIn"
    :confirm-pending="confirmPending"
    :check-in-pending="checkInPending"
    @confirm-slot="emit('confirm-slot')"
    @submit-check-in="emit('submit-check-in')"
  />
</template>

<script setup lang="ts">
import AnchorAttendancePanel from "@/domains/pr/ui/sections/AnchorAttendancePanel.vue";
import SharedPRActionsBar from "@/domains/pr/ui/sections/SharedPRActionsBar.vue";

defineProps<{
  canJoin: boolean;
  canExit: boolean;
  hasJoined: boolean;
  isCreator: boolean;
  canConfirm: boolean;
  canCheckIn: boolean;
  showEditContentAction: boolean;
  showModifyStatusAction: boolean;
  slotStateText: string;
  joinPending: boolean;
  exitPending: boolean;
  confirmPending: boolean;
  checkInPending: boolean;
}>();

const emit = defineEmits<{
  join: [];
  exit: [];
  "confirm-slot": [];
  "submit-check-in": [];
  "edit-content": [];
  "modify-status": [];
}>();
</script>
