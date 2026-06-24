<template>
  <PuPageScaffold
    viewport="screen"
    class="bill-detail-page"
    data-testid="bill-detail.page"
  >
    <template #header>
      <PuPageHeader
        title="账单详情"
        show-back
        @back="handleBack"
      >
        <template v-if="detail" #actions>
          <PuButton
            :action="{ to: { path: `/orders/${detail.order.id}` } }"
            shape="pill"
            tone="neutral"
            variant="outline"
            size="sm"
            data-testid="bill-detail.order-link"
          >
            查看订单
          </PuButton>
        </template>

        <template v-if="detail" #meta>
          <div class="bill-detail-page__header-meta">
            <PuTag
              :text="billStatusTag.label"
              :tone="billStatusTag.tone"
              variant="soft"
              shape="pill"
              size="md"
              data-testid="bill-detail.status"
            />
            <span
              class="bill-detail-page__total-amount"
              data-testid="bill-detail.total-amount"
            >
              总金额 {{ totalAmountLabel }}
            </span>
          </div>
        </template>
      </PuPageHeader>
    </template>

    <div class="bill-detail-page__body">
      <PuInlineNotice
        v-if="billId === null"
        tone="error"
        title="账单无效"
        message="缺少账单编号。"
      />

      <PuInlineNotice
        v-else-if="billQuery.isError.value"
        tone="error"
        title="无法加载账单"
        :message="billErrorMessage"
      />

      <div
        v-else-if="billQuery.isPending.value || billQuery.isFetching.value"
        class="bill-detail-page__loading"
      >
        正在加载账单...
      </div>

      <div v-else-if="detail" class="bill-detail-page__content">
        <section class="bill-detail-page__line-list" data-testid="bill-detail.lines">
          <BillLineCard
            v-for="line in detail.lines"
            :key="line.id"
            :line="line"
            :selected="selectedPayableLineId === line.id"
            @select="billLineSelection.select(line.id)"
          />
        </section>

        <div v-if="selectedPayableLine" class="bill-detail-page__footer">
          <PuButton
            :action="{ to: { path: selectedPayableLine.checkoutHref } }"
            shape="rect"
            tone="primary"
            variant="solid"
            size="lg"
            block
            data-testid="bill-detail.pay-selected"
          >
            支付 {{ selectedPayableLineAmountLabel }}
          </PuButton>
        </div>
      </div>
    </div>
  </PuPageScaffold>
</template>

<script setup lang="ts">
import {
  PuButton,
  PuInlineNotice,
  PuPageHeader,
  PuPageScaffold,
  PuTag,
  usePuSelect,
} from "@partner-up-dev/design-web";
import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import {
  formatCurrencyAmount,
  resolveBillSettlementTag,
} from "@/domains/commerce/model/bill-display";
import type { BillDetailResponse } from "@/domains/commerce/queries/useCommerce";
import { useBillDetail } from "@/domains/commerce/queries/useCommerce";
import BillLineCard from "@/domains/commerce/ui/bill-detail/BillLineCard.vue";
import { useFallbackBack } from "@/shared/routing/useFallbackBack";

const route = useRoute();

const billId = computed(() => {
  const value = route.params.billId;
  if (typeof value !== "string" || value.length === 0) return null;
  return value;
});

const billQuery = useBillDetail(billId);
const detail = computed(() => billQuery.data.value ?? null);

const backFallbackTo = computed(() =>
  detail.value ? { path: `/orders/${detail.value.order.id}` } : { path: "/" },
);
const { handleBack } = useFallbackBack(backFallbackTo);

const billErrorMessage = computed(() =>
  billQuery.error.value instanceof Error ? billQuery.error.value.message : "加载账单失败。",
);

const billStatusTag = computed(() =>
  detail.value
    ? resolveBillSettlementTag(detail.value.bill)
    : { label: "待支付" as const, tone: "neutral" as const },
);

const totalAmountLabel = computed(() =>
  detail.value
    ? formatCurrencyAmount(detail.value.bill.totalAmountFen, detail.value.bill.currency)
    : "待确认",
);

type PayableBillLine = BillDetailResponse["lines"][number] & {
  checkoutHref: string;
};

const isPayableBillLine = (line: BillDetailResponse["lines"][number]): line is PayableBillLine =>
  line.payableByViewer && typeof line.checkoutHref === "string" && line.checkoutHref.length > 0;

const payableLines = computed<PayableBillLine[]>(() =>
  (detail.value?.lines ?? []).filter(isPayableBillLine),
);

const payableLineIds = computed(() => payableLines.value.map((line) => line.id));
const payableLineIdSet = computed(() => new Set(payableLineIds.value));

const billLineSelection = usePuSelect<string>({
  multiple: false,
  isOptionDisabled: (lineId) => !payableLineIdSet.value.has(lineId),
});

watch(
  payableLineIds,
  (nextIds) => {
    const currentSelected = billLineSelection.selectedValues.value[0];
    if (currentSelected && nextIds.includes(currentSelected)) return;
    billLineSelection.setValue(nextIds[0]);
  },
  { immediate: true },
);

const selectedPayableLineId = computed(() => billLineSelection.selectedValues.value[0] ?? null);

const selectedPayableLine = computed(
  () => payableLines.value.find((line) => line.id === selectedPayableLineId.value) ?? null,
);

const selectedPayableLineAmountLabel = computed(() =>
  selectedPayableLine.value
    ? formatCurrencyAmount(selectedPayableLine.value.amountFen, selectedPayableLine.value.currency)
    : "待确认",
);
</script>

<style scoped lang="scss">
.bill-detail-page {
  min-width: 0;
  --pu-page-max-width: 44rem;
  --pu-page-padding-bottom: 0;
}

.bill-detail-page__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

.bill-detail-page__loading {
  color: var(--sys-color-on-surface-variant);
}

.bill-detail-page__header-meta {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-medium);
}

.bill-detail-page__total-amount {
  @include mx.pu-font(control);
  flex: 0 0 auto;
  color: var(--sys-color-on-surface);
  white-space: nowrap;
}

.bill-detail-page__content {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--sys-spacing-medium);
}

.bill-detail-page__line-list {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  overflow: auto;
  padding-bottom: var(--sys-spacing-small);
}

.bill-detail-page__footer {
  flex: 0 0 auto;
  padding-top: var(--sys-spacing-small);
  padding-bottom: calc(var(--sys-spacing-medium) + env(safe-area-inset-bottom, 0px));
  background: var(--sys-color-surface);
}
</style>
