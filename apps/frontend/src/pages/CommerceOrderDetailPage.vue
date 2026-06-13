<template>
  <PuPageScaffold viewport="screen" class="order-detail-page" data-testid="order-detail.page">
    <template #header>
      <PageHeader
        title="订单详情"
        subtitle="查看支付、账单和预约进度"
        :back-fallback-to="backFallbackTo"
      >
        <template #top-actions>
          <ActionLink
            :to="{ name: 'contact-support' }"
            appearance="pill"
            variant="outline"
            size="sm"
            data-testid="order-detail.contact-support.open"
          >
            客服
          </ActionLink>
        </template>
      </PageHeader>
    </template>

    <div class="order-detail-page__body">
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

        <template v-if="rideHailingDetail">
          <section
            class="order-detail-page__ride"
            data-testid="order-detail.ride-hailing.page"
          >
            <div
              class="order-detail-page__ride-map"
              data-testid="order-detail.ride-hailing.route-map"
            >
              <div class="order-detail-page__ride-polyline"></div>
              <div class="order-detail-page__ride-callout order-detail-page__ride-callout--origin">
                {{ rideHailingDetail.route.origin.name }}
              </div>
              <div class="order-detail-page__ride-callout order-detail-page__ride-callout--destination">
                {{ rideHailingDetail.route.destination.name }}
              </div>
            </div>

            <PuCard as="section" gap="md">
              <div class="order-detail-page__section-heading">
                <p class="order-detail-page__eyebrow">Ride</p>
                <h2 data-testid="order-detail.ride-hailing.status">
                  {{ rideStatusLabel }}
                </h2>
              </div>

              <div class="order-detail-page__facts">
                <div>
                  <span>车型</span>
                  <strong data-testid="order-detail.ride-hailing.selected-vehicle">
                    {{ rideHailingDetail.selectedVehicleName }}
                  </strong>
                </div>
                <div>
                  <span>路线</span>
                  <strong data-testid="order-detail.ride-hailing.route-summary">
                    {{ rideRouteSummary }}
                  </strong>
                </div>
                <div>
                  <span>乘客</span>
                  <strong data-testid="order-detail.ride-hailing.passengers">
                    {{ ridePassengersLabel }}
                  </strong>
                </div>
                <div v-if="rideHailingDetail.driver || rideHailingDetail.live?.driver">
                  <span>司机</span>
                  <strong data-testid="order-detail.ride-hailing.driver">
                    {{ rideDriverLabel }}
                  </strong>
                </div>
                <div v-if="rideHailingDetail.vehicle || rideHailingDetail.live?.vehicle">
                  <span>车辆</span>
                  <strong data-testid="order-detail.ride-hailing.vehicle">
                    {{ rideVehicleLabel }}
                  </strong>
                </div>
              </div>

              <ActionLink
                v-if="detail.bill"
                :to="{ path: `/bills/${detail.bill.id}` }"
                size="lg"
                data-testid="order-detail.ride-hailing.bill-detail-link"
              >
                查看账单并支付
              </ActionLink>
            </PuCard>
          </section>
        </template>

        <template v-else>
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

          <ActionLink
            v-if="detail.bill"
            :to="{ path: `/bills/${detail.bill.id}` }"
            size="lg"
            data-testid="order-detail.bill-detail-link"
          >
            查看账单并支付
          </ActionLink>
          </PuCard>

          <PuCard as="section" gap="md">
          <div class="order-detail-page__section-heading">
            <p class="order-detail-page__eyebrow">Cancellation</p>
            <h2>取消政策</h2>
          </div>

          <div
            class="order-detail-page__policy"
            data-testid="order-detail.cancellation-policy"
          >
            <p
              v-for="summary in cancellationPolicySummary"
              :key="summary"
            >
              {{ summary }}
            </p>
          </div>

          <Button
            v-if="detail.cancellation.canRequest"
            tone="danger"
            :loading="cancelMutation.isPending.value"
            data-testid="order-detail.cancel-rental"
            @click="cancelRentalOrder"
          >
            取消订单
          </Button>

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

          <Button
            v-if="canConfirmRentalBooking"
            size="lg"
            tone="secondary"
            :loading="confirmationMutation.isPending.value"
            data-testid="order-detail.mock-rental-confirm"
            @click="simulateBookingConfirmation"
          >
            模拟确认预订
          </Button>

          <PuInlineNotice
            v-if="detail.fulfillment?.bookingStatus === 'BOOKING_CONFIRMED'"
            tone="success"
            title="预约成功"
            message="场地履约已经进入已确认状态。"
            data-testid="order-detail.rental.booking-confirmed"
          />
          </PuCard>
        </template>
      </template>
    </div>
  </PuPageScaffold>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { PuCard, PuInlineNotice, PuPageScaffold } from "@partner-up-dev/design-web";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import Button from "@/shared/ui/actions/Button.vue";
import ActionLink from "@/shared/ui/actions/ActionLink.vue";
import {
  useCancelRentalOrder,
  useCommerceOrderDetail,
  useMockRentalBookingConfirmation,
} from "@/domains/commerce/queries/useCommerce";

const route = useRoute();

const orderId = computed(() => {
  const value = route.params.orderId;
  if (typeof value !== "string" || value.length === 0) return null;
  return value;
});

const orderQuery = useCommerceOrderDetail(orderId);
const cancelMutation = useCancelRentalOrder();
const confirmationMutation = useMockRentalBookingConfirmation();

const detail = computed(() => orderQuery.data.value ?? null);
const rideHailingDetail = computed(() => detail.value?.rideHailing ?? null);

const primaryItemName = computed(
  () => detail.value?.order.items[0]?.sku.name ?? "订单项目",
);

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

const participantCountLabel = computed(() => {
  if (rideHailingDetail.value) {
    return `${rideHailingDetail.value.riders.length} 人`;
  }
  return `${detail.value?.order.participantCount ?? 0} 人`;
});

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

const canConfirmRentalBooking = computed(
  () =>
    detail.value?.order.status === "OPEN" &&
    detail.value?.payment.status === "PAID" &&
    detail.value.fulfillment?.bookingStatus === "PENDING_BOOKING",
);

const cancellationPolicySummary = computed(() => {
  const items = detail.value?.order.items ?? [];
  return items.flatMap((item) =>
    (item.sku.cancellationPolicySnapshot?.tiers ?? []).map(
      (tier) =>
        `${item.sku.name}：${tier.visibleLabel}，退款 ${tier.refundPercent}%${
          tier.requiresOperatorHandling ? "，需人工处理" : ""
        }`,
    ),
  );
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

const latestCancellationAttempt = computed(
  () => detail.value?.cancellation.latestAttempt ?? null,
);
const isCancellationPending = computed(
  () => latestCancellationAttempt.value?.status === "PENDING",
);

const backFallbackTo = computed(() => ({ path: "/" }));

const serviceWindowLabel = computed(() => {
  if (rideHailingDetail.value) {
    return rideHailingDetail.value.departureAt
      ? `${formatDateTime(rideHailingDetail.value.departureAt)} 出发`
      : "现在出发";
  }
  const start = detail.value?.order.serviceStartAt ?? null;
  const end = detail.value?.order.serviceEndAt ?? null;
  return `${formatDateTime(start)} - ${formatDateTime(end)}`;
});

const rideStatusLabel = computed(() => {
  const ride = rideHailingDetail.value;
  if (!ride) return "未知状态";
  if (ride.live?.statusLabel) return ride.live.statusLabel;
  if (detail.value?.order.status === "FAILED") return "呼叫失败";
  if (ride.executionPhase === "FINISHED") return "待支付";
  if (ride.executionPhase === "CANCELLED") return "已取消";
  if (ride.executionPhase === "FAILED") return "呼叫失败";
  if (ride.executionPhase === "IN_TRIP") return "行程中";
  if (ride.executionPhase === "ACCEPTED") return "已接单";
  if (ride.executionPhase === "DISPATCHING") return "正在呼叫";
  return "正在创建";
});

const rideRouteSummary = computed(() => {
  const route = rideHailingDetail.value?.route;
  if (!route) return "路线待确认";
  const waypoints = route.waypoints.map((point) => point.name);
  return [route.origin.name, ...waypoints, route.destination.name].join(" → ");
});

const ridePassengersLabel = computed(() => {
  const riders = rideHailingDetail.value?.riders ?? [];
  if (riders.length === 0) return "同乘人待确认";
  return `同乘人：${riders.map((rider) => rider.displayName).join("、")}`;
});

const rideDriverLabel = computed(() => {
  const driver =
    rideHailingDetail.value?.driver ?? rideHailingDetail.value?.live?.driver;
  if (!driver) return "";
  return [driver.driverName, driver.driverPhone].filter(Boolean).join(" ");
});

const rideVehicleLabel = computed(() => {
  const vehicle =
    rideHailingDetail.value?.vehicle ?? rideHailingDetail.value?.live?.vehicle;
  if (!vehicle) return "";
  return [vehicle.plate, vehicle.color, vehicle.brand].filter(Boolean).join(" ");
});

const orderErrorMessage = computed(() =>
  orderQuery.error.value instanceof Error
    ? orderQuery.error.value.message
    : "加载订单失败。",
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

const cancelRentalOrder = async (): Promise<void> => {
  if (!orderId.value) return;
  await cancelMutation.mutateAsync(orderId.value);
};

const simulateBookingConfirmation = async (): Promise<void> => {
  if (!orderId.value) return;
  await confirmationMutation.mutateAsync(orderId.value);
};

let ridePollingTimer: number | undefined;

onMounted(() => {
  ridePollingTimer = window.setInterval(() => {
    if (detail.value?.order.family !== "RIDE_HAILING" || detail.value.bill) return;
    void orderQuery.refetch();
  }, 1500);
});

onUnmounted(() => {
  if (ridePollingTimer !== undefined) {
    window.clearInterval(ridePollingTimer);
  }
});
</script>

<style scoped lang="scss">
.order-detail-page {
  min-width: 0;
  --pu-page-max-width: 44rem;
}

.order-detail-page__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  min-height: 0;
  overflow: auto;
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
    justify-content: space-between;
    gap: var(--sys-spacing-medium);
    min-width: 0;
    padding: var(--sys-spacing-small);
    border-radius: var(--sys-radius-small);
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

.order-detail-page__ride {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.order-detail-page__ride-map {
  position: relative;
  min-height: 18rem;
  overflow: hidden;
  border-radius: var(--sys-radius-medium);
  background:
    linear-gradient(135deg, rgb(226 236 229 / 0.95), rgb(223 232 241 / 0.96)),
    repeating-linear-gradient(
      45deg,
      rgb(255 255 255 / 0.36) 0,
      rgb(255 255 255 / 0.36) 0.5rem,
      transparent 0.5rem,
      transparent 2rem
    );
}

.order-detail-page__ride-polyline {
  position: absolute;
  inset: 27% 18% 30% 18%;
  border-bottom: 0.28rem solid var(--sys-color-primary);
  border-left: 0.28rem solid var(--sys-color-primary);
  border-radius: 0 0 0 5rem;
}

.order-detail-page__ride-callout {
  position: absolute;
  max-width: min(74%, 18rem);
  min-height: 2.5rem;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  padding: var(--sys-spacing-xsmall) var(--sys-spacing-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
  box-shadow: var(--sys-shadow-2);
}

.order-detail-page__ride-callout--origin {
  top: 16%;
  left: 10%;
}

.order-detail-page__ride-callout--destination {
  right: 10%;
  bottom: 15%;
}

.order-detail-page__policy {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
  padding: var(--sys-spacing-small);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-high);

  p {
    margin: 0;
    color: var(--sys-color-on-surface-variant);
  }
}
</style>
