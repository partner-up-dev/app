<template>
  <PuPageScaffold
    viewport="screen"
    width="full"
    padding="none"
    class="order-detail-page"
    data-testid="order-detail.page"
  >
    <template #pageHeader>
      <PuHeader title="订单详情" title-as="h1">
        <template #leading>
          <PuButton
            tone="neutral"
            variant="ghost"
            size="sm"
            aria-label="返回上一页"
            @click="handleBack"
          >
            <template #leading>
              <span class="i-mdi-arrow-left" aria-hidden="true"></span>
            </template>
          </PuButton>
        </template>
        <template #actions>
          <PuButton
            :action="{ to: { name: 'contact-support' } }"
            shape="pill"
            tone="primary"
            variant="outline"
            size="sm"
            data-testid="order-detail.contact-support.open"
          >
            客服
          </PuButton>
        </template>
      </PuHeader>
    </template>

    <div
      class="order-detail-page__body"
      :class="{ 'order-detail-page__body--immersive': rideHailingDetail }"
    >
      <PuInlineNotice
        v-if="orderId === null"
        tone="error"
        title="订单无效"
        message="缺少订单编号。"
      />

      <PuInlineNotice
        v-else-if="orderQuery.isError.value"
        tone="error"
        title="无法加载订单"
        :message="orderErrorMessage"
      />

      <div v-else-if="orderQuery.isPending.value" class="order-detail-page__loading">
        正在加载订单...
      </div>

      <template v-else-if="detail">
        <RideHailingOrderContent
          v-if="rideHailingDetail"
          :detail="detail"
          :ride="rideHailingDetail"
          :provider-observation="orderQuery.providerObservation.value"
          :route-order-id="orderId"
        />

        <div v-else class="order-detail-page__document-body">
          <PuCard as="section" gap="md">
            <div class="order-detail-page__section-heading">
              <p class="order-detail-page__eyebrow">Order</p>
              <h2 data-testid="order-detail.item-name">{{ primaryItemName }}</h2>
            </div>

            <div class="order-detail-page__facts">
              <div>
                <span>订单状态</span>
                <strong data-testid="order-detail.order-status">
                  {{ orderStatusLabel }}
                </strong>
              </div>
              <div>
                <span>服务时间</span>
                <strong data-testid="order-detail.service-window">
                  {{ serviceWindowLabel }}
                </strong>
              </div>
              <div>
                <span>参与人数</span>
                <strong data-testid="order-detail.participant-count">
                  {{ participantCountLabel }}
                </strong>
              </div>
            </div>
          </PuCard>

          <PuCard as="section" gap="md">
            <div class="order-detail-page__section-heading">
              <p class="order-detail-page__eyebrow">Bill</p>
              <h2 data-testid="order-detail.total-price">
                {{ formatFen(billEffectiveTotalFen) }}
              </h2>
            </div>

            <div class="order-detail-page__bill-lines">
              <div
                v-for="line in detail.bill?.lines ?? []"
                :key="line.id"
                data-testid="order-detail.bill-line"
              >
                <span>{{ line.label }}</span>
                <strong>{{ formatFen(line.amountFen) }}</strong>
              </div>
            </div>

            <p class="order-detail-page__status" data-testid="order-detail.payment-status">
              支付状态：{{ paymentStatusLabel }}
            </p>

            <PuButton
              v-if="detail.bill"
              :action="{ to: { path: `/bills/${detail.bill.id}` } }"
              shape="rect"
              tone="primary"
              variant="solid"
              size="lg"
              data-testid="order-detail.bill-detail-link"
            >
              查看账单并支付
            </PuButton>
          </PuCard>

          <PuCard as="section" gap="md">
            <div class="order-detail-page__section-heading">
              <p class="order-detail-page__eyebrow">Cancellation</p>
              <h2>取消政策</h2>
            </div>

            <div class="order-detail-page__policy" data-testid="order-detail.cancellation-policy">
              <p v-for="summary in cancellationPolicySummary" :key="summary">
                {{ summary }}
              </p>
            </div>

            <PuButton
              v-if="detail.order.family !== 'RENTAL' && detail.cancellation.canRequest"
              tone="danger"
              variant="outline"
              :loading="cancelMutation.isPending.value"
              data-testid="order-detail.cancel"
              @click="cancelOrder"
            >
              取消订单
            </PuButton>

            <PuInlineNotice
              v-if="isCancellationPending"
              tone="info"
              title="取消处理中"
              message="取消请求已提交，等待履约方处理。"
              data-testid="order-detail.rental.cancellation-pending"
            />

            <PuInlineNotice
              v-if="detail.order.status === 'CANCELLED'"
              tone="success"
              title="订单已取消"
              :message="cancellationResultMessage"
              data-testid="order-detail.rental.cancelled"
            />
          </PuCard>

          <PuCard as="section" gap="md">
            <div class="order-detail-page__section-heading">
              <p class="order-detail-page__eyebrow">Fulfillment</p>
              <h2>场地预订</h2>
            </div>

            <p class="order-detail-page__status" data-testid="order-detail.fulfillment-status">
              {{ fulfillmentStatusLabel }}
            </p>

            <PuInlineNotice
              v-if="detail.fulfillment?.bookingStatus === 'BOOKING_CONFIRMED'"
              tone="success"
              title="预约成功"
              message="场地履约已经进入已确认状态。"
              data-testid="order-detail.rental.booking-confirmed"
            />
          </PuCard>
        </div>
      </template>
    </div>
  </PuPageScaffold>
</template>

<script setup lang="ts">
import {
  PuButton,
  PuCard,
  PuHeader,
  PuInlineNotice,
  PuPageScaffold,
} from "@partner-up-dev/design-web";
import { storeToRefs } from "pinia";
import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import {
  type CommerceOrderDetailResponse,
  useCancelOrder,
  useCommerceOrderDetail,
} from "@/domains/commerce/queries/useCommerce";
import RideHailingOrderContent from "@/domains/commerce/ui/order-detail/RideHailingOrderContent.vue";
import { logCommerceOrderDetailDebug } from "@/domains/commerce/use-cases/order-detail-debug";
import { useOrderingHandoffStore } from "@/domains/commerce/use-cases/useOrderingHandoffStore";
import { useFallbackBack } from "@/shared/routing/useFallbackBack";

type OrderItemSnapshot = CommerceOrderDetailResponse["order"]["items"][number];
type OrderSkuSnapshot = Extract<OrderItemSnapshot, { kind?: "FIXED"; sku: unknown }>["sku"];

const route = useRoute();
const orderingHandoff = useOrderingHandoffStore();
const { orderingEntry } = storeToRefs(orderingHandoff);

const orderId = computed(() => {
  const value = route.params.orderId;
  if (typeof value !== "string" || value.length === 0) return null;
  return value;
});

const orderQuery = useCommerceOrderDetail(orderId);
const cancelMutation = useCancelOrder();

const detail = computed(() => orderQuery.data.value ?? null);
const rideHailingDetail = computed(() => detail.value?.rideHailing ?? null);

watch(
  () => ({
    routeOrderId: orderId.value,
    queryStatus: orderQuery.status.value,
    fetchStatus: orderQuery.fetchStatus.value,
    isPending: orderQuery.isPending.value,
    isFetching: orderQuery.isFetching.value,
    dataOrderId: detail.value?.order.id ?? null,
    dataOrderStatus: detail.value?.order.status ?? null,
    dataOrderFamily: detail.value?.order.family ?? null,
    rideProviderOrderId: rideHailingDetail.value?.provider.providerOrderId ?? null,
    rideExecutionPhase: rideHailingDetail.value?.executionPhase ?? null,
    rideDriverName: rideHailingDetail.value?.driver?.driverName ?? null,
    rideVehiclePlate: rideHailingDetail.value?.vehicle?.plate ?? null,
    billId: detail.value?.bill?.id ?? null,
    billStatus: detail.value?.bill?.status ?? null,
    error: orderQuery.error.value instanceof Error ? orderQuery.error.value.message : null,
  }),
  (snapshot) => {
    logCommerceOrderDetailDebug("page.snapshot", snapshot);
  },
  { immediate: true },
);

const readOrderItemSku = (item: OrderItemSnapshot): OrderSkuSnapshot | null => {
  if ("sku" in item) return item.sku;
  return item.resolution?.sku ?? item.candidates[0]?.sku ?? null;
};

const primaryItemName = computed(() => {
  const item = detail.value?.order.items[0] ?? null;
  return item ? (readOrderItemSku(item)?.name ?? "订单项目") : "订单项目";
});

const paymentStatusLabel = computed(() => {
  if (detail.value?.payment.status === "PAID") return "已支付";
  if (detail.value?.payment.status === "PARTIALLY_PAID") return "部分已支付";
  return "待支付";
});

const billEffectiveTotalFen = computed(() => {
  const lines = detail.value?.bill?.lines ?? [];
  if (lines.length === 0) {
    return null;
  }
  return lines.reduce((sum, line) => {
    return sum + (line.kind === "CHARGE" ? line.amountFen : -line.amountFen);
  }, 0);
});

const orderStatusLabel = computed(() => {
  if (detail.value?.order.status === "CANCELLED") return "已取消";
  if (detail.value?.order.status === "FAILED") return "创建失败";
  if (detail.value?.order.status === "INITIATING") return "正在创建";
  if (detail.value?.order.status === "OPEN") return "进行中";
  return detail.value?.order.status ?? "未知";
});

const participantCountLabel = computed(() => `${detail.value?.order.participantCount ?? 0} 人`);

const fulfillmentStatusLabel = computed(() => {
  if (detail.value?.order.status === "CANCELLED") {
    return "订单已取消，无需继续履约。";
  }
  const fulfillment = detail.value?.fulfillment;
  if (!fulfillment) return "等待支付后创建履约。";
  if (fulfillment.bookingStatus === "BOOKING_CONFIRMED") {
    return "场地方已确认预订。";
  }
  return "支付完成，等待场地方确认预订。";
});

const cancellationPolicySummary = computed(() => {
  const items = detail.value?.order.items ?? [];
  return items.flatMap((item) => {
    const sku = readOrderItemSku(item);
    return (sku?.cancellationPolicySnapshot?.tiers ?? []).map(
      (tier) =>
        `${sku?.name ?? "订单项目"}：${tier.visibleLabel}，退款 ${tier.refundPercent}%${
          tier.requiresOperatorHandling ? "，需人工处理" : ""
        }`,
    );
  });
});

const cancellationResultMessage = computed(() => {
  const latest = latestCancellationAttempt.value;
  if (!latest || latest.status !== "APPROVED") {
    return "订单已经取消。";
  }
  if (latest.effectKind === "POLICY_REFUND" && latest.effectAmountFen) {
    return `已按取消政策调整账单，退款调整 ${formatFen(latest.effectAmountFen)}。`;
  }
  return "已按取消政策调整账单。";
});

const latestCancellationAttempt = computed(() => detail.value?.cancellation.latestAttempt ?? null);
const isCancellationPending = computed(() => latestCancellationAttempt.value?.status === "PENDING");

const backFallbackTo = computed(() =>
  orderingEntry.value?.prId ? { path: `/pr/${orderingEntry.value.prId}` } : { path: "/" },
);
const { handleBack } = useFallbackBack(backFallbackTo);

const serviceWindowLabel = computed(() => {
  const start = detail.value?.order.serviceStartAt ?? null;
  const end = detail.value?.order.serviceEndAt ?? null;
  return `${formatDateTime(start)} - ${formatDateTime(end)}`;
});

const orderErrorMessage = computed(() =>
  orderQuery.error.value instanceof Error ? orderQuery.error.value.message : "加载订单失败。",
);

const formatFen = (amountFen: number | null | undefined): string => {
  if (typeof amountFen !== "number") return "待确认";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(amountFen / 100);
};

const formatDateTime = (value: string | null): string => {
  if (!value) return "未确定";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const cancelOrder = async (): Promise<void> => {
  if (!orderId.value) return;
  await cancelMutation.mutateAsync(orderId.value);
};

</script>

<style scoped lang="scss">
.order-detail-page {
  min-width: 0;
  --pu-page-scaffold-region-gap: var(--sys-spacing-small);
}

.order-detail-page__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  width: 100%;
  min-height: 0;
  overflow: auto;
  padding: var(--sys-spacing-medium);
}

.order-detail-page__body--immersive {
  gap: 0;
  overflow: hidden;
  padding: 0;
}

.order-detail-page__document-body {
  display: flex;
  width: min(100%, var(--pu-page-max-width, 44rem));
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  margin: 0 auto;
  padding-bottom: var(--sys-spacing-medium);
}

.order-detail-page__loading,
.order-detail-page__status {
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

.order-detail-page__section-heading {
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

.order-detail-page__eyebrow {
  @include mx.pu-font(control);
  color: var(--sys-color-primary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.order-detail-page__facts,
.order-detail-page__bill-lines {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);

  div {
    display: flex;
    min-width: 0;
    justify-content: space-between;
    gap: var(--sys-spacing-medium);
    border-radius: var(--sys-radius-small);
    padding: var(--sys-spacing-small);
    background: var(--sys-color-surface-container-high);
  }

  span {
    color: var(--sys-color-on-surface-variant);
  }

  strong {
    color: var(--sys-color-on-surface);
    text-align: right;
  }
}

.order-detail-page__policy {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
  border-radius: var(--sys-radius-small);
  padding: var(--sys-spacing-small);
  background: var(--sys-color-surface-container-high);

  p {
    margin: 0;
    color: var(--sys-color-on-surface-variant);
  }
}
</style>
