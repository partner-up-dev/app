<template>
  <div class="fallback-gate">
    <p class="fallback-gate__text">确认加入当前活动？</p>
    <p class="fallback-gate__text">加入后即可按流程完成确认与签到。</p>
    <div class="fallback-gate__actions">
      <Button
        tone="surface"
        type="button"
        :disabled="pending"
        @click="emit('cancel')"
      >
        取消
      </Button>
      <Button
        type="button"
        :loading="pending"
        data-testid="pr-detail.join.confirm"
        @click="emit('confirm')"
      >
        确认加入
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from "@/shared/ui/actions/Button.vue";

defineProps<{
  pending: boolean;
}>();

const emit = defineEmits<{
  cancel: [];
  confirm: [];
}>();
</script>

<style lang="scss" scoped>
.fallback-gate {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.fallback-gate__text {
  margin: 0;
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

.fallback-gate__actions {
  display: flex;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
}

.fallback-gate__actions > button {
  flex: 1 1 140px;
}
</style>
