<template>
  <PuPageScaffold
    viewport="screen"
    class="bill-detail-page"
    data-testid="bill-detail.page"
  >
    <template #header>
      <PuPageHeader
        title="账单详情"
        subtitle="每个人只支付自己的账单行"
        show-back
        @back="handleBack"
      />
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

      <template v-else-if="detail">
        <PuCard as="section" gap="md">
          <div class="bill-detail-page__section-heading">
            <p class="bill-detail-page__eyebrow">Bill</p>
            <h2>{{ detail.order.itemName }}</h2>
          </div>

          <div class="bill-detail-page__summary-grid">
            <div>
              <span>应付合计</span>
              <strong data-testid="bill-detail.charge-total">
                {{ formatFen(detail.bill.chargeTotalFen) }}
              </strong>
            </div>
            <div>
              <span>已支付</span>
              <strong data-testid="bill-detail.paid-total">
                {{ formatFen(detail.bill.paidChargeFen) }}
              </strong>
            </div>
            <div>
              <span>应退合计</span>
              <strong data-testid="bill-detail.refund-total">
                {{ formatFen(detail.bill.refundTotalFen) }}
              </strong>
            </div>
            <div>
              <span>已退款</span>
              <strong data-testid="bill-detail.refunded-total">
                {{ formatFen(detail.bill.refundedFen) }}
              </strong>
            </div>
            <div>
              <span>结算状态</span>
              <strong data-testid="bill-detail.settlement-status">
                {{ settlementStatusLabel }}
              </strong>
            </div>
          </div>

          <PuButton
            :action="{ to: { path: `/orders/${detail.order.id}` } }"
            shape="rect"
            tone="primary"
            variant="outline"
            data-testid="bill-detail.order-link"
          >
            返回订单详情
          </PuButton>
        </PuCard>

        <PuCard as="section" gap="md">
          <div class="bill-detail-page__section-heading">
            <p class="bill-detail-page__eyebrow">Lines</p>
            <h2>账单责任</h2>
          </div>

          <div class="bill-detail-page__line-list">
            <div
              v-for="line in detail.lines"
              :key="line.id"
              class="bill-detail-page__line"
              data-testid="bill-detail.line"
            >
              <div class="bill-detail-page__line-summary">
                <div>
                  <strong>{{ line.label }}</strong>
                  <span>{{ line.description ?? "无补充说明" }}</span>
                  <small>
                    {{
                      line.userId === detail.viewer.userId
                        ? "你的账单行"
                        : "其他参与者账单行"
                    }}
                  </small>
                </div>
                <b
                  >{{ line.kind === "REFUND" ? "-" : ""
                  }}{{ formatFen(line.amountFen) }}</b
                >
              </div>

              <div class="bill-detail-page__line-footer">
                <span data-testid="bill-detail.line-status">
                  {{ lineStatusLabel(line.settlementStatus) }}
                </span>
                <PuButton
                  v-if="line.payableByViewer && line.checkoutHref"
                  :action="{ to: { path: line.checkoutHref } }"
                  shape="rect"
                  tone="primary"
                  variant="solid"
                  size="sm"
                  data-testid="bill-detail.pay-line"
                >
                  去支付
                </PuButton>
              </div>
            </div>
          </div>
        </PuCard>
      </template>
    </div>
  </PuPageScaffold>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { PuButton, PuCard, PuInlineNotice, PuPageHeader, PuPageScaffold } from "@partner-up-dev/design-web";
import { useFallbackBack } from "@/shared/routing/useFallbackBack";
import { useBillDetail } from "@/domains/commerce/queries/useCommerce";

const route = useRoute();

const billId = computed(() => {
  const value = route.params.billId;
  if (typeof value !== "string" || value.length === 0) return null;
  return value;
});

const billQuery = useBillDetail(billId);
const detail = computed(() => billQuery.data.value ?? null);

const settlementStatusLabel = computed(() => {
  if (
    detail.value &&
    detail.value.bill.refundTotalFen > 0 &&
    detail.value.bill.refundedFen >= detail.value.bill.refundTotalFen
  ) {
    return "已退款";
  }
  if (detail.value && detail.value.bill.refundTotalFen > 0) return "退款处理中";
  if (detail.value?.bill.settlementStatus === "PAID") return "已支付";
  if (detail.value?.bill.settlementStatus === "PARTIALLY_PAID")
    return "部分已支付";
  return "待支付";
});

const backFallbackTo = computed(() =>
  detail.value ? { path: `/orders/${detail.value.order.id}` } : { path: "/" },
);
const { handleBack } = useFallbackBack(backFallbackTo);

const billErrorMessage = computed(() =>
  billQuery.error.value instanceof Error
    ? billQuery.error.value.message
    : "加载账单失败。",
);

const lineStatusLabel = (status: string): string => {
  if (status === "PAID") return "已支付";
  if (status === "ACTION_REQUIRED") return "待完成支付";
  if (status === "PROCESSING") return "支付处理中";
  if (status === "FAILED") return "支付失败，可重试";
  if (status === "REFUND_PENDING") return "退款处理中";
  if (status === "REFUNDED") return "已退款";
  return "待支付";
};

const formatFen = (amountFen: number | null | undefined): string => {
  if (typeof amountFen !== "number") return "待确认";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(amountFen / 100);
};
</script>

<style scoped lang="scss">
.bill-detail-page {
  min-width: 0;
  --pu-page-max-width: 44rem;
}

.bill-detail-page__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  min-height: 0;
  overflow: auto;
  padding-bottom: var(--sys-spacing-medium);
}

.bill-detail-page__loading {
  color: var(--sys-color-on-surface-variant);
}

.bill-detail-page__section-heading {
  display: flex;
  flex-direction: column;
  gap: calc(var(--sys-spacing-xsmall) / 2);

  h2,
  p {
    margin: 0;
  }

  h2 {
    @include mx.pu-font(title);
    color: var(--sys-color-on-surface);
  }
}

.bill-detail-page__eyebrow {
  @include mx.pu-font(control);
  color: var(--sys-color-primary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.bill-detail-page__summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: var(--sys-spacing-small);

  div {
    display: flex;
    flex-direction: column;
    gap: calc(var(--sys-spacing-xsmall) / 2);
    padding: var(--sys-spacing-small);
    border-radius: var(--sys-radius-small);
    background: var(--sys-color-surface-container-high);
  }

  span {
    @include mx.pu-font(control);
    color: var(--sys-color-on-surface-variant);
  }

  strong {
    color: var(--sys-color-on-surface);
  }
}

.bill-detail-page__line-list {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.bill-detail-page__line {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  padding: var(--sys-spacing-small);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface-container-high);
}

.bill-detail-page__line-summary,
.bill-detail-page__line-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-medium);
}

.bill-detail-page__line-summary {
  div {
    display: flex;
    flex-direction: column;
    gap: calc(var(--sys-spacing-xsmall) / 2);
  }

  span,
  small {
    color: var(--sys-color-on-surface-variant);
  }

  b {
    color: var(--sys-color-on-surface);
    white-space: nowrap;
  }
}

.bill-detail-page__line-footer {
  span {
    color: var(--sys-color-primary);
  }
}

@media (max-width: 42rem) {
  .bill-detail-page__summary-grid {
    grid-template-columns: 1fr;
  }

  .bill-detail-page__line-summary,
  .bill-detail-page__line-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
