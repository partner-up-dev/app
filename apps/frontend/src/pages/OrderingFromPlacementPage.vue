<template>
  <FullScreenPageScaffold class="ordering-page" :data-testid="orderingPageTestId">
    <template #header>
      <PageHeader
        title="确认预订"
        subtitle="确认场地、时间、人数和登记信息后创建订单"
        :back-fallback-to="backFallbackTo"
      />
    </template>

    <div class="ordering-page__body">
      <InlineNotice
        v-if="missingInput"
        tone="error"
        title="入口无效"
        message="缺少创建订单所需的入口参数。"
      />

      <InlineNotice
        v-else-if="orderingQuery.isError.value"
        tone="error"
        title="无法加载预订信息"
        :message="orderingErrorMessage"
      />

      <div v-else-if="orderingQuery.isPending.value" class="ordering-page__loading">
        正在加载可预订内容...
      </div>

      <template v-else-if="rentalOrdering">
        <SurfaceCard gap="md">
          <div class="ordering-page__section-heading">
            <p class="ordering-page__eyebrow">场地服务</p>
            <h2 data-testid="ordering.rental.product-name">
              {{ primarySpu?.name ?? "可预订场地" }}
            </h2>
          </div>

          <ul
            v-if="primarySpu?.sellingPoints.length"
            class="ordering-page__selling-points"
          >
            <li
              v-for="point in primarySpu.sellingPoints"
              :key="point"
            >
              {{ point }}
            </li>
          </ul>
        </SurfaceCard>

        <SurfaceCard gap="md">
          <div class="ordering-page__section-heading">
            <p class="ordering-page__eyebrow">已从 PR 锁定</p>
            <h2>服务时间与人数</h2>
          </div>

          <div class="ordering-page__facts">
            <div>
              <span>人数</span>
              <strong data-testid="ordering.rental.participant-count">
                {{ participantCount }} 人
              </strong>
            </div>
            <div>
              <span>开始</span>
              <strong data-testid="ordering.rental.service-start">
                {{ formatDateTime(serviceStartAt) }}
              </strong>
            </div>
            <div>
              <span>结束</span>
              <strong data-testid="ordering.rental.service-end">
                {{ formatDateTime(serviceEndAt) }}
              </strong>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard gap="md">
          <div class="ordering-page__section-heading">
            <p class="ordering-page__eyebrow">选择 SKU</p>
            <h2>可预订规格</h2>
          </div>

          <div class="ordering-page__sku-list">
            <ChoiceCard
              v-for="sku in selectableSkus"
              :key="sku.skuId"
              :active="sku.skuId === selectedSkuId"
              :disabled="!sku.selectable"
              data-testid="ordering.rental.sku-option"
              @click="selectedSkuId = sku.skuId"
            >
              <div class="ordering-page__sku-card">
                <div>
                  <strong>{{ sku.name }}</strong>
                  <span>
                    {{ sku.facts.participantCount }} 人 ·
                    {{ Math.round(sku.facts.durationMinutes / 60) }} 小时
                  </span>
                </div>
                <b>{{ formatFen(sku.pricingModel.amountFen) }}</b>
              </div>
            </ChoiceCard>
          </div>

          <div class="ordering-page__policy" data-testid="ordering.rental.cancellation-policy">
            <strong>取消政策</strong>
            <p v-if="selectedCancellationSummary.length === 0">
              暂无可展示的取消政策。
            </p>
            <p
              v-for="summary in selectedCancellationSummary"
              :key="`${summary.visibleLabel}-${summary.refundPercent}`"
            >
              {{ summary.visibleLabel }} · 退款 {{ summary.refundPercent }}%
              <span v-if="summary.requiresOperatorHandling"> · 需人工处理</span>
            </p>
          </div>
        </SurfaceCard>

        <SurfaceCard gap="md">
          <div class="ordering-page__section-heading">
            <p class="ordering-page__eyebrow">登记信息</p>
            <h2>联系人与入场人</h2>
          </div>

          <FormField
            label="联系人电话"
            for-id="rental-contact-phone"
            required
          >
            <input
              id="rental-contact-phone"
              v-model.trim="contactPhone"
              class="ordering-page__input"
              inputmode="tel"
              autocomplete="tel"
              data-testid="ordering.rental.contact-phone"
              placeholder="请输入联系人手机号"
            />
          </FormField>

          <div class="ordering-page__registrants">
            <FormField
              v-for="(_, index) in registrantNames"
              :key="index"
              :label="`入场人 ${index + 1}`"
              :for-id="`rental-registrant-${index}`"
              required
            >
              <input
                :id="`rental-registrant-${index}`"
                v-model.trim="registrantNames[index]"
                class="ordering-page__input"
                autocomplete="name"
                :data-testid="`ordering.rental.registrant-name.${index}`"
                placeholder="请输入真实姓名"
              />
            </FormField>
          </div>
        </SurfaceCard>

        <SurfaceCard
          v-if="primarySpu?.noticeBlocks.length"
          gap="sm"
          tone="outline"
        >
          <div
            v-for="notice in primarySpu.noticeBlocks"
            :key="notice.title"
            class="ordering-page__notice-block"
          >
            <strong>{{ notice.title }}</strong>
            <p>{{ notice.content }}</p>
          </div>
        </SurfaceCard>
      </template>

      <template v-else-if="rideOrdering">
        <section class="ordering-page__ride-map" data-testid="ordering.ride-hailing.route-map">
          <div class="ordering-page__ride-polyline" data-testid="ordering.ride-hailing.route-polyline"></div>
          <button
            type="button"
            class="ordering-page__route-callout ordering-page__route-callout--origin"
            data-testid="ordering.ride-hailing.route-point.origin"
          >
            {{ rideOrdering.route.origin.name }}
            <span class="i-mdi-chevron-right"></span>
          </button>
          <button
            type="button"
            class="ordering-page__route-callout ordering-page__route-callout--destination"
            data-testid="ordering.ride-hailing.route-point.destination"
          >
            {{ rideOrdering.route.destination.name }}
            <span class="i-mdi-chevron-right"></span>
          </button>
        </section>

        <SurfaceCard gap="sm">
          <div class="ordering-page__ride-row">
            <button
              type="button"
              data-testid="ordering.ride-hailing.departure-time"
              @click="activeRideDrawer = 'departure'"
            >
              {{ rideDepartureLabel }}
              <span class="i-mdi-chevron-right"></span>
            </button>
            <button
              type="button"
              data-testid="ordering.ride-hailing.riders"
              @click="activeRideDrawer = 'riders'"
            >
              同乘人
              <span class="i-mdi-chevron-right"></span>
            </button>
            <button
              type="button"
              data-testid="ordering.ride-hailing.contact"
              @click="activeRideDrawer = 'contact'"
            >
              联系方式
              <span class="i-mdi-chevron-right"></span>
            </button>
          </div>
        </SurfaceCard>

        <div
          v-if="activeRideDrawer === 'departure'"
          class="ordering-page__drawer"
          data-testid="ordering.ride-hailing.departure-drawer"
        >
          <strong>{{ rideDepartureLabel }}</strong>
        </div>
        <div
          v-if="activeRideDrawer === 'riders'"
          class="ordering-page__drawer"
          data-testid="ordering.ride-hailing.riders-drawer"
        >
          <div
            v-for="rider in rideRiders"
            :key="rider.userId"
          >
            {{ rider.displayName }}
          </div>
        </div>
        <div
          v-if="activeRideDrawer === 'contact'"
          class="ordering-page__drawer"
          data-testid="ordering.ride-hailing.contact-drawer"
        >
          <input v-model.trim="rideContactPhone" class="ordering-page__input" />
        </div>

        <div class="ordering-page__ride-vehicles">
          <ChoiceCard
            v-for="option in rideQuoteOptions"
            :key="option.skuId"
            :active="option.skuId === selectedRideSkuId"
            :disabled="!option.selectable"
            data-testid="ordering.ride-hailing.vehicle-card"
            @click="selectedRideSkuId = option.skuId"
          >
            <div class="ordering-page__ride-card">
              <div>
                <strong>{{ option.displayName }}</strong>
                <span>{{ option.disabledReason ?? "实时预估" }}</span>
                <i
                  v-if="option.skuId === selectedRideSkuId"
                  data-testid="ordering.ride-hailing.vehicle-card.selected"
                ></i>
              </div>
              <b>{{ formatFen(option.quoteAmountFen) }}</b>
            </div>
          </ChoiceCard>
        </div>
      </template>
    </div>

    <template #footer>
      <div v-if="rentalOrdering" class="ordering-page__bottom-bar">
        <div>
          <span>预估应付</span>
          <strong data-testid="ordering.rental.price">
            {{ formatFen(pricePreviewFen) }}
          </strong>
          <button
            type="button"
            class="ordering-page__text-button"
            data-testid="ordering.rental.price-detail.toggle"
            @click="priceDetailOpen = !priceDetailOpen"
          >
            {{ priceDetailOpen ? "收起价格明细" : "查看价格明细" }}
          </button>
        </div>
        <Button
          size="lg"
          :disabled="!canCreate"
          :loading="createOrderMutation.isPending.value"
          data-testid="ordering.rental.create-order"
          @click="submitOrder"
        >
          创建订单
        </Button>
      </div>

      <InlineNotice
        v-if="rentalOrdering && availabilityMessage"
        class="ordering-page__footer-notice"
        tone="warning"
        :message="availabilityMessage"
      />
      <InlineNotice
        v-if="rentalOrdering && createOrderMutation.isError.value"
        class="ordering-page__footer-notice"
        tone="error"
        :message="createOrderErrorMessage"
      />
      <div
        v-if="rentalOrdering && priceDetailOpen"
        class="ordering-page__price-detail"
        data-testid="ordering.rental.price-detail"
      >
        <div
          v-for="explanation in priceExplanations"
          :key="explanation.sourceId"
        >
          <span>{{ explanation.label }}</span>
          <small>{{ explanation.description }}</small>
          <strong>{{ formatFen(explanation.resultAmountFen ?? explanation.deltaFen) }}</strong>
        </div>
      </div>

      <div v-if="rideOrdering" class="ordering-page__bottom-bar">
        <div>
          <span>预估区间</span>
          <strong data-testid="ordering.ride-hailing.quote-price-range">
            {{ ridePriceRangeLabel }}
          </strong>
        </div>
        <Button
          size="lg"
          :disabled="!canCreateRide"
          :loading="createRideOrderMutation.isPending.value"
          data-testid="ordering.ride-hailing.create-order"
          @click="submitRideOrder"
        >
          创建订单
        </Button>
      </div>
      <InlineNotice
        v-if="rideOrdering && rideAvailabilityMessage"
        class="ordering-page__footer-notice"
        tone="warning"
        :message="rideAvailabilityMessage"
      />
      <InlineNotice
        v-if="rideOrdering && createRideOrderMutation.isError.value"
        class="ordering-page__footer-notice"
        tone="error"
        :message="createRideOrderErrorMessage"
        data-testid="ordering.ride-hailing.create-error"
      />
    </template>
  </FullScreenPageScaffold>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter, type LocationQueryValue } from "vue-router";
import FullScreenPageScaffold from "@/shared/ui/layout/FullScreenPageScaffold.vue";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import InlineNotice from "@/shared/ui/feedback/InlineNotice.vue";
import SurfaceCard from "@/shared/ui/containers/SurfaceCard.vue";
import ChoiceCard from "@/shared/ui/containers/ChoiceCard.vue";
import FormField from "@/shared/ui/forms/FormField.vue";
import Button from "@/shared/ui/actions/Button.vue";
import {
  useCreateRentalOrder,
  useCreateRideHailingOrder,
  useEvaluateRideHailingOrdering,
  useEvaluateRentalOrdering,
  useOrderingFromPlacement,
  type RentalOrderCreateInput,
  type RentalOrderingResponse,
  type RideHailingOrderCreateInput,
  type RideHailingOrderingResponse,
} from "@/domains/commerce/queries/useCommerce";

type RentalSpu = RentalOrderingResponse["spus"][number];
type RentalSku = RentalSpu["skuOptions"][number];
type RideSpu = RideHailingOrderingResponse["spus"][number];
type RideQuoteOption = RideSpu["skuOptions"][number];

const route = useRoute();
const router = useRouter();

const parsePositiveQueryInt = (
  value: LocationQueryValue | LocationQueryValue[],
): number | null => {
  if (Array.isArray(value)) return parsePositiveQueryInt(value[0] ?? null);
  if (typeof value !== "string") return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const placementInstanceId = computed(() =>
  parsePositiveQueryInt(route.query.placementInstanceId),
);
const contextId = computed(() => parsePositiveQueryInt(route.query.contextId));
const missingInput = computed(
  () => placementInstanceId.value === null || contextId.value === null,
);

const orderingQuery = useOrderingFromPlacement(
  placementInstanceId,
  contextId,
);
const evaluateMutation = useEvaluateRentalOrdering();
const createOrderMutation = useCreateRentalOrder();
const rideEvaluationMutation = useEvaluateRideHailingOrdering();
const createRideOrderMutation = useCreateRideHailingOrder();

const ordering = computed(() => orderingQuery.data.value ?? null);
const rentalOrdering = computed<RentalOrderingResponse | null>(() =>
  ordering.value?.productType === "RENTAL" ? ordering.value : null,
);
const rideOrdering = computed<RideHailingOrderingResponse | null>(() =>
  ordering.value?.productType === "RIDE_HAILING" ? ordering.value : null,
);
const orderingPageTestId = computed(() =>
  rideOrdering.value ? "ordering.ride-hailing.page" : "ordering.rental.page",
);
const selectedSkuId = ref<number | null>(null);
const contactPhone = ref("");
const registrantNames = ref<string[]>([]);
const priceDetailOpen = ref(false);
const selectedRideSkuId = ref<number | null>(null);
const activeRideDrawer = ref<"departure" | "riders" | "contact" | null>(null);
const rideContactPhone = ref("");

const allSkus = computed<RentalSku[]>(() =>
  rentalOrdering.value?.spus.flatMap((spu) => spu.skuOptions) ?? [],
);

const selectableSkus = computed<RentalSku[]>(() =>
  allSkus.value.filter((sku) => sku.selectable),
);

const selectedSku = computed<RentalSku | null>(() => {
  if (selectedSkuId.value === null) return null;
  return allSkus.value.find((sku) => sku.skuId === selectedSkuId.value) ?? null;
});

const selectedSpu = computed<RentalSpu | null>(() => {
  if (selectedSkuId.value === null || !rentalOrdering.value) return null;
  return (
    rentalOrdering.value.spus.find((spu) =>
      spu.skuOptions.some((sku) => sku.skuId === selectedSkuId.value),
    ) ?? null
  );
});

const primarySpu = computed(
  () => selectedSpu.value ?? rentalOrdering.value?.spus[0] ?? null,
);

const fieldValue = (key: string): unknown | null =>
  rentalOrdering.value?.input.fields.find((field) => field.key === key)?.value ?? null;

const participantCount = computed(() => {
  const value = fieldValue("participantCount");
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
});

const serviceStartAt = computed(() => {
  const value = fieldValue("serviceStartAt");
  return typeof value === "string" ? value : null;
});

const serviceEndAt = computed(() => {
  const value = fieldValue("serviceEndAt");
  return typeof value === "string" ? value : null;
});

const orderInput = computed<RentalOrderCreateInput | null>(() => {
  if (!rentalOrdering.value || !selectedSpu.value || !selectedSku.value) return null;
  if (!serviceStartAt.value || !serviceEndAt.value) return null;
  const phone = contactPhone.value.trim();
  const names = registrantNames.value.map((name) => name.trim());
  if (!phone || names.length !== participantCount.value || names.some((name) => !name)) {
    return null;
  }

  return {
    placementInstanceId: rentalOrdering.value.source.placementInstanceId,
    context: rentalOrdering.value.source.context,
    items: [
      {
        spuId: selectedSpu.value.spuId,
        skuId: selectedSku.value.skuId,
        quantity: 1,
      },
    ],
    request: {
      serviceStartAt: serviceStartAt.value,
      serviceEndAt: serviceEndAt.value,
      contactPhone: phone,
      registrants: names.map((fullName) => ({ fullName })),
    },
  };
});

const rideRiders = computed(() => rideOrdering.value?.riders ?? []);

const rideBaseOptions = computed<RideQuoteOption[]>(() =>
  rideOrdering.value?.spus.flatMap((spu) => spu.skuOptions) ?? [],
);

const rideQuoteOptions = computed<RideQuoteOption[]>(() => {
  const evaluated = rideEvaluationMutation.data.value?.options ?? [];
  return evaluated.length > 0 ? evaluated : rideBaseOptions.value;
});

const selectedRideQuote = computed<RideQuoteOption | null>(() => {
  if (selectedRideSkuId.value === null) return null;
  return (
    rideQuoteOptions.value.find((option) => option.skuId === selectedRideSkuId.value) ??
    null
  );
});

const rideDepartureLabel = computed(() => {
  const departureAt = rideOrdering.value?.departureAt ?? null;
  if (!departureAt) return "现在出发";
  return `${formatTime(departureAt)}出发`;
});

const rideOrderInput = computed<RideHailingOrderCreateInput | null>(() => {
  if (!rideOrdering.value || selectedRideSkuId.value === null) return null;
  const phone = rideContactPhone.value.trim();
  if (!phone || rideRiders.value.length === 0) return null;
  return {
    placementInstanceId: rideOrdering.value.source.placementInstanceId,
    context: rideOrdering.value.source.context,
    selectedSkuId: selectedRideSkuId.value,
    route: rideOrdering.value.route,
    departureAt: rideOrdering.value.departureAt,
    riders: rideRiders.value.map((rider) => ({
      userId: rider.userId,
      displayName: rider.displayName,
      phoneMasked: rider.phoneMasked,
    })),
    contactPhone: phone,
  };
});

const rideAvailability = computed(
  () => rideEvaluationMutation.data.value?.availability ?? null,
);

const rideAvailabilityMessage = computed(() => {
  if (!rideOrderInput.value) return "请先补全同乘人与联系方式。";
  if (rideEvaluationMutation.isPending.value) return "正在获取曹操预估价...";
  return rideAvailability.value?.disabledReason ?? null;
});

const ridePriceRangeLabel = computed(() => {
  const range = rideEvaluationMutation.data.value?.priceRange ?? null;
  const prices =
    range && (range.minFen !== null || range.maxFen !== null)
      ? [range.minFen, range.maxFen].filter(
          (value): value is number => typeof value === "number",
        )
      : rideQuoteOptions.value
          .map((option) => option.quoteAmountFen)
          .filter((value): value is number => typeof value === "number");
  if (prices.length === 0) return "待确认";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatFen(min) : `${formatFen(min)} - ${formatFen(max)}`;
});

const canCreateRide = computed(
  () =>
    !!rideOrderInput.value &&
    !rideEvaluationMutation.isPending.value &&
    rideAvailability.value?.createOrderEnabled === true,
);

const availability = computed(
  () => evaluateMutation.data.value?.availability ?? null,
);

const availabilityMessage = computed(() => {
  if (!orderInput.value) return "请先补全联系人与入场人信息。";
  if (evaluateMutation.isPending.value) return "正在确认库存与价格...";
  return availability.value?.disabledReason ?? null;
});

const canCreate = computed(
  () =>
    !!orderInput.value &&
    !evaluateMutation.isPending.value &&
    availability.value?.createOrderEnabled === true,
);

const pricePreviewFen = computed(
  () =>
    evaluateMutation.data.value?.pricePreview.amountFen ??
    selectedSku.value?.pricingModel.amountFen ??
    null,
);

const priceExplanations = computed(
  () => evaluateMutation.data.value?.pricePreview.explanations ?? [],
);

const selectedCancellationSummary = computed(
  () => selectedSku.value?.cancellationPolicySummary ?? [],
);

const orderingErrorMessage = computed(() =>
  orderingQuery.error.value instanceof Error
    ? orderingQuery.error.value.message
    : "加载预订信息失败。",
);

const createOrderErrorMessage = computed(() =>
  createOrderMutation.error.value instanceof Error
    ? createOrderMutation.error.value.message
    : "创建订单失败。",
);

const createRideOrderErrorMessage = computed(() =>
  createRideOrderMutation.error.value instanceof Error
    ? `下单失败，请重试。${createRideOrderMutation.error.value.message}`
    : "创建订单失败。",
);

const backFallbackTo = computed(() =>
  contextId.value ? { path: `/pr/${contextId.value}` } : { path: "/" },
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

const formatTime = (value: string): string =>
  new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));

watch(
  rentalOrdering,
  (next) => {
    if (!next) return;
    const defaultSku =
      next.spus
        .flatMap((spu) => spu.skuOptions)
        .find((sku) => sku.selected && sku.selectable) ??
      next.spus.flatMap((spu) => spu.skuOptions).find((sku) => sku.selectable) ??
      null;
    selectedSkuId.value = defaultSku?.skuId ?? null;
  },
  { immediate: true },
);

watch(
  rideOrdering,
  (next) => {
    if (!next) return;
    rideContactPhone.value = next.contactPhone ?? "";
    const defaultOption =
      next.spus
        .flatMap((spu) => spu.skuOptions)
        .find((option) => option.selected && option.selectable) ??
      next.spus.flatMap((spu) => spu.skuOptions).find((option) => option.selectable) ??
      null;
    selectedRideSkuId.value = defaultOption?.skuId ?? null;
  },
  { immediate: true },
);

watch(
  participantCount,
  (next) => {
    const normalizedCount = Number.isFinite(next) && next > 0 ? next : 0;
    registrantNames.value = Array.from(
      { length: normalizedCount },
      (_, index) => registrantNames.value[index] ?? "",
    );
  },
  { immediate: true },
);

watch(
  orderInput,
  (next) => {
    if (!next) return;
    evaluateMutation.mutate(next);
  },
  { deep: true },
);

watch(
  rideOrderInput,
  (next) => {
    if (!next) return;
    rideEvaluationMutation.mutate(next);
  },
  { deep: true },
);

const submitOrder = async (): Promise<void> => {
  if (!orderInput.value) return;
  const result = await createOrderMutation.mutateAsync(orderInput.value);
  await router.push({ path: `/orders/${result.orderId}` });
};

const submitRideOrder = async (): Promise<void> => {
  if (!rideOrderInput.value) return;
  const result = await createRideOrderMutation.mutateAsync(rideOrderInput.value);
  await router.push({ path: `/orders/${result.orderId}` });
};
</script>

<style scoped lang="scss">
.ordering-page {
  min-width: 0;
  --pu-page-max-width: 44rem;
}

.ordering-page__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  min-height: 0;
  overflow: auto;
  padding-bottom: var(--sys-spacing-medium);
}

.ordering-page__loading {
  color: var(--sys-color-on-surface-variant);
}

.ordering-page__section-heading {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xxsmall);

  h2,
  p {
    margin: 0;
  }

  h2 {
    @include mx.pu-font(title-large);
    color: var(--sys-color-on-surface);
  }
}

.ordering-page__eyebrow {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-primary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.ordering-page__selling-points {
  display: grid;
  gap: var(--sys-spacing-xsmall);
  margin: 0;
  padding-left: var(--sys-spacing-medium);
  color: var(--sys-color-on-surface-variant);
}

.ordering-page__facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--sys-spacing-small);

  div {
    display: flex;
    flex-direction: column;
    gap: var(--sys-spacing-xxsmall);
    min-width: 0;
    padding: var(--sys-spacing-small);
    border-radius: var(--sys-radius-small);
    background: var(--sys-color-surface-container-high);
  }

  span {
    @include mx.pu-font(label-medium);
    color: var(--sys-color-on-surface-variant);
  }

  strong {
    @include mx.pu-font(body-medium);
    color: var(--sys-color-on-surface);
  }
}

.ordering-page__sku-list,
.ordering-page__registrants {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.ordering-page__policy {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xxsmall);
  padding: var(--sys-spacing-small);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-high);

  p {
    margin: 0;
    color: var(--sys-color-on-surface-variant);
  }
}

.ordering-page__sku-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-medium);
  width: 100%;

  div {
    display: flex;
    flex-direction: column;
    gap: var(--sys-spacing-xxsmall);
  }

  span {
    color: var(--sys-color-on-surface-variant);
  }

  b {
    color: var(--sys-color-primary);
    white-space: nowrap;
  }
}

.ordering-page__input {
  width: 100%;
  min-height: var(--sys-size-large);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-small);
  padding: 0 var(--sys-spacing-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
  font: inherit;

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.ordering-page__notice-block {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xxsmall);

  p {
    margin: 0;
    color: var(--sys-color-on-surface-variant);
  }
}

.ordering-page__ride-map {
  position: relative;
  min-height: 18rem;
  overflow: hidden;
  border-radius: var(--sys-radius-medium);
  background:
    linear-gradient(135deg, rgb(229 236 226 / 0.9), rgb(225 233 241 / 0.95)),
    repeating-linear-gradient(
      45deg,
      rgb(255 255 255 / 0.34) 0,
      rgb(255 255 255 / 0.34) 0.5rem,
      transparent 0.5rem,
      transparent 2rem
    );
}

.ordering-page__ride-polyline {
  position: absolute;
  inset: 26% 18% 30% 18%;
  border-bottom: 0.28rem solid var(--sys-color-primary);
  border-left: 0.28rem solid var(--sys-color-primary);
  border-radius: 0 0 0 5rem;
}

.ordering-page__route-callout {
  position: absolute;
  display: inline-flex;
  align-items: center;
  max-width: min(72%, 18rem);
  min-height: 2.75rem;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  padding: 0 var(--sys-spacing-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
  box-shadow: var(--sys-elevation-level2);
  cursor: pointer;
  font: inherit;
  text-align: left;

  span {
    flex: 0 0 auto;
    margin-left: var(--sys-spacing-xsmall);
  }
}

.ordering-page__route-callout--origin {
  top: 16%;
  left: 10%;
}

.ordering-page__route-callout--destination {
  right: 10%;
  bottom: 15%;
}

.ordering-page__ride-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--sys-spacing-small);

  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: var(--sys-size-large);
    min-width: 0;
    border: none;
    border-radius: var(--sys-radius-small);
    padding: 0 var(--sys-spacing-small);
    background: var(--sys-color-surface-container-high);
    color: var(--sys-color-on-surface);
    cursor: pointer;
    font: inherit;
  }
}

.ordering-page__drawer {
  position: sticky;
  bottom: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  padding: var(--sys-spacing-medium);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium) var(--sys-radius-medium) 0 0;
  background: var(--sys-color-surface);
  box-shadow: var(--sys-elevation-level3);
}

.ordering-page__ride-vehicles {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.ordering-page__ride-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--sys-spacing-medium);
  align-items: center;
  width: 100%;

  div {
    display: flex;
    flex-direction: column;
    gap: var(--sys-spacing-xxsmall);
    min-width: 0;
  }

  span {
    color: var(--sys-color-on-surface-variant);
  }

  i {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 999px;
    background: var(--sys-color-primary);
  }

  b {
    color: var(--sys-color-primary);
    white-space: nowrap;
  }
}

.ordering-page__bottom-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--sys-spacing-medium);
  align-items: center;
  padding: var(--sys-spacing-medium);
  border-radius: var(--sys-radius-large) var(--sys-radius-large) 0 0;
  background: var(--sys-color-surface-container-high);

  div {
    display: flex;
    flex-direction: column;
    gap: var(--sys-spacing-xxsmall);
  }

  span {
    @include mx.pu-font(label-medium);
    color: var(--sys-color-on-surface-variant);
  }

  strong {
    @include mx.pu-font(title-large);
    color: var(--sys-color-on-surface);
  }
}

.ordering-page__text-button {
  width: fit-content;
  border: none;
  padding: 0;
  background: transparent;
  color: var(--sys-color-primary);
  cursor: pointer;
  font: inherit;
  text-align: left;

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.ordering-page__footer-notice {
  margin: 0 var(--sys-spacing-medium) var(--sys-spacing-small);
}

.ordering-page__price-detail {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
  margin: 0 var(--sys-spacing-medium) var(--sys-spacing-small);
  padding: var(--sys-spacing-small);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface-container);

  div {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--sys-spacing-xsmall) var(--sys-spacing-medium);
  }

  small {
    color: var(--sys-color-on-surface-variant);
  }

  strong {
    grid-row: span 2;
    align-self: center;
    color: var(--sys-color-on-surface);
  }
}


@media (max-width: 42rem) {
  .ordering-page__facts {
    grid-template-columns: 1fr;
  }

  .ordering-page__ride-row {
    grid-template-columns: 1fr;
  }

  .ordering-page__bottom-bar {
    grid-template-columns: 1fr;
  }
}
</style>
