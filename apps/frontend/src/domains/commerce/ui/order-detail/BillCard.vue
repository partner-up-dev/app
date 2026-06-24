<template>
  <PuCard
    as="article"
    class="bill-card"
    variant="outline"
    padding="sm"
    gap="sm"
    data-testid="order-detail.ride-hailing.bill-card"
  >
    <div class="bill-card__header">
      <PuTag
        v-if="settlementTag"
        :text="settlementTag.label"
        :tone="settlementTag.tone"
        variant="soft"
        shape="pill"
        size="sm"
        data-testid="order-detail.ride-hailing.bill-card.status"
      />
      <span v-else class="bill-card__status-placeholder">
        {{ statusPlaceholder }}
      </span>

      <PuButton
        :action="billLinkAction"
        shape="rect"
        tone="primary"
        variant="outline"
        size="sm"
        data-testid="order-detail.ride-hailing.bill-card.view"
      >
        查看
      </PuButton>
    </div>

    <strong
      class="bill-card__amount"
      data-testid="order-detail.ride-hailing.bill-card.amount"
    >
      {{ amountLabel }}
    </strong>
  </PuCard>
</template>

<script setup lang="ts">
import { PuButton, PuCard, PuTag } from "@partner-up-dev/design-web";
import { computed } from "vue";
import {
  calculateBillEffectiveTotalFen,
  resolveBillSettlementTag,
} from "@/domains/commerce/model/bill-display";
import { useBillDetail } from "@/domains/commerce/queries/useCommerce";

const props = defineProps<{
  billId: string;
}>();

const normalizedBillId = computed(() => {
  const value = props.billId.trim();
  return value.length > 0 ? value : null;
});

const billQuery = useBillDetail(normalizedBillId);
const detail = computed(() => billQuery.data.value ?? null);

const settlementTag = computed(() =>
  detail.value ? resolveBillSettlementTag(detail.value.bill) : null,
);

const statusPlaceholder = computed(() => (billQuery.isError.value ? "状态待确认" : "正在加载账单"));

const amountLabel = computed(() => {
  if (detail.value) {
    return formatFen(calculateBillEffectiveTotalFen(detail.value.bill));
  }
  return billQuery.isError.value ? "暂时无法加载金额" : "正在加载金额...";
});

const billLinkAction = computed(() =>
  normalizedBillId.value ? { to: { path: `/bills/${normalizedBillId.value}` } } : undefined,
);

const formatFen = (amountFen: number | null | undefined): string => {
  if (typeof amountFen !== "number") return "待确认";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(amountFen / 100);
};
</script>

<style scoped lang="scss">
.bill-card {
  border-radius: var(--sys-radius-small);
}

.bill-card__header {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
}

.bill-card__status-placeholder {
  @include mx.pu-font(caption);
  min-width: 0;
  color: var(--sys-color-on-surface-variant);
}

.bill-card__amount {
  @include mx.pu-font(title);
  color: var(--sys-color-on-surface);
}
</style>
