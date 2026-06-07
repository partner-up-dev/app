<template>
  <BottomDrawer
    :open="open"
    title="价格明细"
    max-width="44rem"
    @close="$emit('close')"
  >
    <div class="ordering-price-detail" :data-testid="dataTestid">
      <div v-if="explanations.length === 0" class="ordering-price-detail__empty">
        暂无可展示的价格明细。
      </div>
      <div
        v-for="explanation in explanations"
        :key="explanation.sourceId"
        class="ordering-price-detail__row"
      >
        <div>
          <strong>{{ explanation.label }}</strong>
          <span>{{ explanation.description }}</span>
        </div>
        <b>{{ formatFen(explanation.resultAmountFen ?? explanation.deltaFen) }}</b>
      </div>
    </div>
  </BottomDrawer>
</template>

<script setup lang="ts">
import BottomDrawer from "@/shared/ui/overlay/BottomDrawer.vue";

type PriceExplanation = {
  sourceId: string;
  label: string;
  description: string;
  resultAmountFen?: number | null;
  deltaFen: number | null;
};

defineProps<{
  open: boolean;
  explanations: PriceExplanation[];
  dataTestid?: string;
}>();

defineEmits<{
  close: [];
}>();

const formatFen = (amountFen: number | null | undefined): string => {
  if (typeof amountFen !== "number") return "待确认";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(amountFen / 100);
};
</script>

<style scoped lang="scss">
.ordering-price-detail {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.ordering-price-detail__empty {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

.ordering-price-detail__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--sys-spacing-medium);
  align-items: center;
  padding: var(--sys-spacing-small) 0;
  border-bottom: 1px solid var(--sys-color-outline-variant);

  div {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: calc(var(--sys-spacing-xsmall) / 2);
  }

  strong {
    @include mx.pu-font(body);
  }

  span {
    @include mx.pu-font(support);
    color: var(--sys-color-on-surface-variant);
    overflow-wrap: anywhere;
  }

  b {
    color: var(--sys-color-on-surface);
    white-space: nowrap;
  }
}
</style>
