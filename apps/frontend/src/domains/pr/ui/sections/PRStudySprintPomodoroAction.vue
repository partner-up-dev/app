<template>
  <div
    v-if="showAction"
    class="utility-action-cell study-sprint-action"
    data-region="study-sprint-pomodoro"
  >
    <Button
      tone="outline"
      block
      :disabled="!canEnter"
      data-testid="pr-detail.study-sprint-pomodoro.open"
      @click="handleOpen"
    >
      {{ actionLabel }}
    </Button>
    <p
      v-if="!canEnter"
      class="action-tip"
      data-testid="pr-detail.study-sprint-pomodoro.disabled-hint"
    >
      活动开始后可进入专注房间
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import type { PRDetailView } from "@/domains/pr/model/types";
import Button from "@/shared/ui/actions/Button.vue";

const props = defineProps<{
  pr: PRDetailView;
}>();

const router = useRouter();

const showAction = computed(
  () =>
    props.pr.core.type === "STUDY_SPRINT" &&
    props.pr.partnerSection.viewer.isParticipant,
);
const canEnter = computed(() => props.pr.status === "ACTIVE");

const durationMinutes = computed(() => {
  const [startRaw, endRaw] = props.pr.core.time;
  if (!startRaw || !endRaw) return 30;
  const startAt = new Date(startRaw);
  const endAt = new Date(endRaw);
  const diffMs = endAt.getTime() - startAt.getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 30;
  return Math.max(1, Math.ceil(diffMs / 60_000));
});

const actionLabel = computed(
  () => `开始一起专注${durationMinutes.value}分钟`,
);

const handleOpen = (): void => {
  if (!showAction.value || !canEnter.value) return;
  router.push({
    name: "pr-study-sprint",
    params: {
      id: String(props.pr.id),
    },
    query: {
      duration: String(durationMinutes.value),
    },
  });
};
</script>

<style lang="scss" scoped>
.utility-action-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.action-tip {
  margin: 0;
  @include mx.pu-font(support);
  color: var(--sys-color-on-surface-variant);
}
</style>
