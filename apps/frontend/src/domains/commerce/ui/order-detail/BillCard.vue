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

      <strong
        class="bill-card__amount"
        data-testid="order-detail.ride-hailing.bill-card.amount"
      >
        {{ amountLabel }}
      </strong>
    </div>
    <PuButton
        :action="billLinkAction"
        shape="rect"
        tone="neutral"
        variant="soft"
        size="sm"
        data-testid="order-detail.ride-hailing.bill-card.view"
      >
        查看
      </PuButton>

  </PuCard>
</template>

<script setup lang="ts">
import { PuButton, PuCard, PuTag } from "@partner-up-dev/design-web";
import { computed } from "vue";
import {
  formatCurrencyAmount,
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
    return formatCurrencyAmount(detail.value.bill.totalAmountFen, detail.value.bill.currency);
  }
  return billQuery.isError.value ? "暂时无法加载金额" : "正在加载金额...";
});

const billLinkAction = computed(() =>
  normalizedBillId.value ? { to: { path: `/bills/${normalizedBillId.value}` } } : undefined,
);
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
