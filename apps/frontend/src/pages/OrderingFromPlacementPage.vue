<template>
  <FullScreenPageScaffold class="ordering-page" :data-testid="orderingPageTestId">
    <template #header>
      <PageHeader
        title="确认预订"
        subtitle="确认内容后创建订单"
        :back-fallback-to="backFallbackTo"
      >
        <template #top-actions>
          <ActionLink
            :to="{ name: 'contact-support' }"
            appearance="pill"
            tone="outline"
            size="sm"
            data-testid="ordering.contact-support.open"
          >
            客服
          </ActionLink>
        </template>
      </PageHeader>
    </template>

    <div class="ordering-page__body">
      <InlineNotice
        v-if="missingInput"
        tone="error"
        title="入口无效"
        message="缺少创建订单所需的入口参数。"
      />

      <RentalOrderingContent
        v-else-if="rentalOrdering && orderingContentInput"
        :input="orderingContentInput"
        @update:output="contentOutput = $event"
      />

      <RideHailingOrderingContent
        v-else-if="rideOrdering && orderingContentInput"
        :input="orderingContentInput"
        :evaluated-options="rideEvaluatedOptions"
        @update:output="contentOutput = $event"
      />
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
          <strong>
            {{ formatFen(explanation.resultAmountFen ?? explanation.deltaFen) }}
          </strong>
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
          :disabled="!canCreate"
          :loading="createOrderMutation.isPending.value"
          data-testid="ordering.ride-hailing.create-order"
          @click="submitOrder"
        >
          创建订单
        </Button>
      </div>
      <InlineNotice
        v-if="rideOrdering && availabilityMessage"
        class="ordering-page__footer-notice"
        tone="warning"
        :message="availabilityMessage"
      />
      <InlineNotice
        v-if="rideOrdering && createOrderMutation.isError.value"
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
import { useRouter } from "vue-router";
import FullScreenPageScaffold from "@/shared/ui/layout/FullScreenPageScaffold.vue";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import InlineNotice from "@/shared/ui/feedback/InlineNotice.vue";
import ActionLink from "@/shared/ui/actions/ActionLink.vue";
import Button from "@/shared/ui/actions/Button.vue";
import RentalOrderingContent from "@/domains/commerce/ui/ordering/RentalOrderingContent.vue";
import RideHailingOrderingContent, {
  type RideVehicleOption,
} from "@/domains/commerce/ui/ordering/RideHailingOrderingContent.vue";
import {
  useCreateOrder,
  useEvaluateOrdering,
  type CreateOrderInput,
} from "@/domains/commerce/queries/useCommerce";
import {
  ORDERING_ENTRY_STORAGE_KEY,
  type OrderingEntryPayload,
} from "@/domains/commerce/model/ordering-entry-storage";
import type {
  OrderingContentInput,
  OrderingContentOutput,
} from "@/domains/commerce/model/ordering-content";

type OrderingOfferDetail = OrderingEntryPayload["offerDetail"];

const router = useRouter();

const readOrderingEntry = (): OrderingEntryPayload | null => {
  const raw = sessionStorage.getItem(ORDERING_ENTRY_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<OrderingEntryPayload>;
    if (typeof parsed.source?.offerId !== "number") return null;
    if (!parsed.offerDetail) return null;
    return {
      source: {
        offerId: parsed.source.offerId,
      },
      offerDetail: parsed.offerDetail,
      prId: typeof parsed.prId === "number" ? parsed.prId : undefined,
      bindings:
        typeof parsed.bindings === "object" && parsed.bindings !== null
          ? parsed.bindings
          : {},
    };
  } catch {
    return null;
  }
};

const orderingEntry = ref<OrderingEntryPayload | null>(readOrderingEntry());
const missingInput = computed(() => orderingEntry.value === null);

const evaluateMutation = useEvaluateOrdering();
const createOrderMutation = useCreateOrder();

const ordering = computed(() => orderingEntry.value?.offerDetail ?? null);
const rentalOrdering = computed<OrderingOfferDetail | null>(() =>
  ordering.value?.productType === "RENTAL" ? ordering.value : null,
);
const rideOrdering = computed<OrderingOfferDetail | null>(() =>
  ordering.value?.productType === "RIDE_HAILING" ? ordering.value : null,
);
const orderingPageTestId = computed(() =>
  rideOrdering.value ? "ordering.ride-hailing.page" : "ordering.rental.page",
);

const contentOutput = ref<OrderingContentOutput | null>(null);
const priceDetailOpen = ref(false);

const orderingContentInput = computed<OrderingContentInput | null>(() => {
  const entry = orderingEntry.value;
  if (!entry) return null;
  return {
    source: entry.source,
    offerDetail: entry.offerDetail,
    bindings: entry.bindings,
  };
});

const createOrderInput = computed<CreateOrderInput | null>(() => {
  const entry = orderingEntry.value;
  const output = contentOutput.value;
  if (!entry || !output) return null;
  return {
    source: entry.source,
    prId: entry.prId ?? null,
    participants: output.participants,
    items: output.items,
    productTypedExtraProperties: output.productTypedExtraProperties,
  };
});

const rideEvaluatedOptions = computed<RideVehicleOption[]>(
  () => evaluateMutation.data.value?.rideHailing?.options ?? [],
);

const availability = computed(
  () => evaluateMutation.data.value?.actions.create_order ?? null,
);

const availabilityMessage = computed(() => {
  if (!createOrderInput.value) return "请先补全下单信息。";
  if (evaluateMutation.isPending.value) return "正在确认价格与可下单状态...";
  return availability.value?.problem?.detail ?? null;
});

const canCreate = computed(
  () =>
    !!createOrderInput.value &&
    !evaluateMutation.isPending.value &&
    availability.value?.allowed === true,
);

const pricePreviewFen = computed(
  () => evaluateMutation.data.value?.price.totalFen ?? null,
);

const priceExplanations = computed(
  () => evaluateMutation.data.value?.price.explanations ?? [],
);

const ridePriceRangeLabel = computed(() => {
  const range = evaluateMutation.data.value?.price.range ?? null;
  const prices =
    range && (range.minFen !== null || range.maxFen !== null)
      ? [range.minFen, range.maxFen].filter(
          (value): value is number => typeof value === "number",
        )
      : rideEvaluatedOptions.value
          .map((option) => option.quoteAmountFen)
          .filter((value): value is number => typeof value === "number");
  if (prices.length === 0) return "待确认";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatFen(min) : `${formatFen(min)} - ${formatFen(max)}`;
});

const createOrderErrorMessage = computed(() =>
  createOrderMutation.error.value instanceof Error
    ? createOrderMutation.error.value.message
    : "创建订单失败。",
);

const createRideOrderErrorMessage = computed(() =>
  createOrderMutation.error.value instanceof Error
    ? `下单失败，请重试。${createOrderMutation.error.value.message}`
    : "创建订单失败。",
);

const backFallbackTo = computed(() =>
  orderingEntry.value?.prId ? { path: `/pr/${orderingEntry.value.prId}` } : { path: "/" },
);

const formatFen = (amountFen: number | null | undefined): string => {
  if (typeof amountFen !== "number") return "待确认";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(amountFen / 100);
};

watch(
  () => orderingEntry.value?.offerDetail.productType,
  () => {
    contentOutput.value = null;
    priceDetailOpen.value = false;
    evaluateMutation.reset();
  },
);

watch(
  createOrderInput,
  (next) => {
    if (!next) return;
    evaluateMutation.mutate(next);
  },
  { deep: true },
);

const submitOrder = async (): Promise<void> => {
  if (!createOrderInput.value) return;
  const result = await createOrderMutation.mutateAsync(createOrderInput.value);
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
  .ordering-page__bottom-bar {
    grid-template-columns: 1fr;
  }
}
</style>
