<template>
  <OrderingPageShell
    :title="t('ordering.pageTitle')"
    :back-fallback-to="backFallbackTo"
    :data-testid="orderingPageTestId"
  >
    <template #actions>
      <PuButton
        :action="{ to: { name: 'contact-support' } }"
        shape="pill"
        tone="primary"
        variant="outline"
        size="sm"
        data-testid="ordering.contact-support.open"
      >
        {{ t("ordering.contactSupportAction") }}
      </PuButton>
    </template>

    <div class="ordering-page__body">
      <PuInlineNotice
        v-if="missingInput"
        tone="error"
        :title="t('ordering.invalidEntryTitle')"
        :message="t('ordering.invalidEntryMessage')"
      />

      <RentalOrderingForm
        v-else-if="rentalOrdering && orderingContentInput"
        :input="orderingContentInput"
        @update:output="handleRentalOutputUpdate"
      />

      <RideHailingOrderingPanel
        v-else-if="rideOrdering && orderingContentInput"
        :input="orderingContentInput"
        :evaluated-options="rideEvaluatedOptions"
        @evaluation-output-change="evaluationContentOutput = $event"
        @update:output="contentOutput = $event"
      />
    </div>

    <template #footer-action>
      <OrderingFooterActionBar
        v-if="rentalOrdering"
        :amount-label="priceDisplayLabel"
        :can-create="canCreate"
        :loading="createOrderMutation.isPending.value"
        :price-detail-enabled="true"
        price-testid="ordering.rental.price"
        price-detail-testid="ordering.rental.price-detail.toggle"
        create-testid="ordering.rental.create-order"
        :create-label="t('ordering.submitAction')"
        @open-price-detail="priceDetailOpen = true"
        @create="submitOrder"
      />
      <OrderingFooterActionBar
        v-if="rideOrdering"
        :amount-label="priceDisplayLabel"
        :can-create="canCreate"
        :loading="createOrderMutation.isPending.value"
        :price-detail-enabled="true"
        price-testid="ordering.ride-hailing.quote-price-range"
        price-detail-testid="ordering.ride-hailing.price-detail.toggle"
        create-testid="ordering.ride-hailing.create-order"
        :create-label="t('ordering.submitAction')"
        @open-price-detail="priceDetailOpen = true"
        @create="submitOrder"
      />
    </template>

    <template #floating>
      <OrderingFloatingNoticeLayer
        v-if="rentalOrdering || rideOrdering"
        :message="floatingNoticeMessage"
        :tone="floatingNoticeTone"
        data-testid="ordering.notice.blocked"
      />
    </template>

    <template #drawer>
      <OrderingPriceDetailDrawer
        :open="priceDetailOpen"
        :explanations="priceExplanations"
        :data-testid="
          rentalOrdering
            ? 'ordering.rental.price-detail'
            : 'ordering.ride-hailing.price-detail'
        "
        @close="priceDetailOpen = false"
      />
    </template>
  </OrderingPageShell>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import OrderingPageShell from "@/domains/commerce/ui/ordering/OrderingPageShell.vue";
import OrderingFooterActionBar from "@/domains/commerce/ui/ordering/OrderingFooterActionBar.vue";
import OrderingFloatingNoticeLayer from "@/domains/commerce/ui/ordering/OrderingFloatingNoticeLayer.vue";
import OrderingPriceDetailDrawer from "@/domains/commerce/ui/ordering/OrderingPriceDetailDrawer.vue";
import RentalOrderingForm from "@/domains/commerce/ui/ordering/RentalOrderingForm.vue";
import { PuButton, PuInlineNotice } from "@partner-up-dev/design-web";
import RideHailingOrderingPanel, {
  type RideVehicleOption,
} from "@/domains/commerce/ui/ordering/RideHailingOrderingPanel.vue";
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

const { t } = useI18n();
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
      bindingLocks:
        typeof parsed.bindingLocks === "object" && parsed.bindingLocks !== null
          ? parsed.bindingLocks
          : {},
    };
  } catch {
    return null;
  }
};

const orderingEntry = ref<OrderingEntryPayload | null>(readOrderingEntry());
const missingInput = computed(() => orderingEntry.value === null);

const createOrderMutation = useCreateOrder();
const evaluateMutation = useEvaluateOrdering();

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
const evaluationContentOutput = ref<OrderingContentOutput | null>(null);
const priceDetailOpen = ref(false);

const orderingContentInput = computed<OrderingContentInput | null>(() => {
  const entry = orderingEntry.value;
  if (!entry) return null;
  return {
    source: entry.source,
    offerDetail: entry.offerDetail,
    bindings: entry.bindings,
    bindingLocks: entry.bindingLocks,
  };
});

const buildOrderInput = (
  output: OrderingContentOutput | null,
): CreateOrderInput | null => {
  const entry = orderingEntry.value;
  if (!entry || !output) return null;
  return {
    source: entry.source,
    prId: entry.prId ?? null,
    participants: output.participants,
    items: output.items,
    productTypedExtraProperties: output.productTypedExtraProperties,
  };
};

const createOrderInput = computed<CreateOrderInput | null>(() =>
  buildOrderInput(contentOutput.value),
);

const evaluationOrderInput = computed<CreateOrderInput | null>(() =>
  buildOrderInput(evaluationContentOutput.value),
);

const rideEvaluatedOptions = computed<RideVehicleOption[]>(
  () => evaluateMutation.data.value?.rideHailing?.options ?? [],
);

const availability = computed(
  () => evaluateMutation.data.value?.actions.create_order ?? null,
);

const createOrderErrorMessage = computed(() =>
  createOrderMutation.error.value instanceof Error
    ? createOrderMutation.error.value.message
    : null,
);

const availabilityMessage = computed(() => {
  if (!createOrderInput.value) return t("ordering.completeInfoNotice");
  if (evaluateMutation.isPending.value) return t("ordering.evaluatingNotice");
  return availability.value?.problem?.detail ?? null;
});

const canCreate = computed(
  () =>
    !!createOrderInput.value &&
    !createOrderMutation.isPending.value &&
    !evaluateMutation.isPending.value &&
    availability.value?.allowed === true,
);

const priceExplanations = computed(
  () => evaluateMutation.data.value?.price.explanations ?? [],
);

const priceDisplayLabel = computed(() => {
  const range = evaluateMutation.data.value?.price.range ?? null;
  const rangePrices = range
    ? [range.minFen, range.maxFen].filter(
        (value): value is number => typeof value === "number",
      )
    : [];
  if (rangePrices.length > 0) {
    const min = Math.min(...rangePrices);
    const max = Math.max(...rangePrices);
    return min === max
      ? formatPriceAmount(min)
      : `${formatPriceAmount(min)}~${formatYuan(max)}`;
  }
  return formatPriceAmount(evaluateMutation.data.value?.price.totalFen ?? null);
});

const floatingNoticeMessage = computed(
  () => createOrderErrorMessage.value ?? availabilityMessage.value,
);

const floatingNoticeTone = computed<"warning" | "error">(() =>
  createOrderErrorMessage.value ? "error" : "warning",
);

const backFallbackTo = computed(() =>
  orderingEntry.value?.prId
    ? { path: `/pr/${orderingEntry.value.prId}` }
    : { path: "/" },
);

const handleRentalOutputUpdate = (next: OrderingContentOutput | null): void => {
  contentOutput.value = next;
  evaluationContentOutput.value = next;
};

const formatYuan = (amountFen: number): string => (amountFen / 100).toFixed(2);

const formatPriceAmount = (amountFen: number | null | undefined): string =>
  typeof amountFen === "number"
    ? `￥${formatYuan(amountFen)}`
    : t("ordering.summary.currencyPending");

watch(
  () => orderingEntry.value?.offerDetail.productType,
  () => {
    contentOutput.value = null;
    evaluationContentOutput.value = null;
    priceDetailOpen.value = false;
    createOrderMutation.reset();
    evaluateMutation.reset();
  },
);

watch(
  createOrderInput,
  () => {
    if (createOrderMutation.error.value) {
      createOrderMutation.reset();
    }
  },
  { deep: true },
);

watch(
  evaluationOrderInput,
  (next) => {
    if (!next) return;
    evaluateMutation.mutate(next);
  },
  { deep: true },
);

const submitOrder = async (): Promise<void> => {
  const input = createOrderInput.value;
  if (!input) return;

  const created = await createOrderMutation.mutateAsync(input);
  await router.push({ path: `/orders/${created.orderId}` });
};
</script>

<style scoped lang="scss">
.ordering-page__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  width: 100%;
  min-height: 0;
  overflow: auto;
  padding-bottom: var(--sys-spacing-medium);
}
</style>
