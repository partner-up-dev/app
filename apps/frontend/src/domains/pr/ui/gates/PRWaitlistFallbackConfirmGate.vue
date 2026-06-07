<template>
  <div class="fallback-gate">
    <p class="fallback-gate__text">确认提交候补？</p>
    <p class="fallback-gate__text">候补成功后会按提交时间顺序等待补位。</p>
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
        data-testid="pr-detail.waitlist.confirm"
        @click="emit('confirm')"
      >
        确认候补
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
