<template>
  <OrderingPageShell
    :title="t('ordering.pageTitle')"
    :back-fallback-to="backFallbackTo"
    :data-testid="orderingPageTestId"
    :no-padding="!!rideOrdering"
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
        :listing-refresh-key="listingRefreshKey"
        @update:output="contentOutput = $event"
        @update:summary="contentSummary = $event"
      />

      <RideHailingOrderingContent
        v-else-if="rideOrdering && orderingContentInput"
        :input="orderingContentInput"
        :listing-refresh-key="listingRefreshKey"
        @update:output="contentOutput = $event"
        @update:summary="contentSummary = $event"
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

    <PuDialog
      :open="orderingDialog.open"
      :title="orderingDialog.title"
      :description="orderingDialog.description"
      :confirm-text="orderingDialog.confirmText"
      cancel-text="取消"
      :show-cancel="orderingDialog.showCancel"
      :show-confirm="true"
      :confirm-loading="createOrderMutation.isPending.value"
      tone="info"
      @close="closeOrderingDialog"
      @cancel="closeOrderingDialog"
      @confirm="handleOrderingDialogConfirm"
    />
  </OrderingPageShell>
</template>

<script setup lang="ts">
import { PuButton, PuDialog, PuInlineNotice } from "@partner-up-dev/design-web";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import type {
  OrderingContentInput,
  OrderingContentOutput,
  OrderingContentSummary,
} from "@/domains/commerce/model/ordering-content";
import {
  ORDERING_ENTRY_STORAGE_KEY,
  type OrderingEntryPayload,
} from "@/domains/commerce/model/ordering-entry-storage";
import { type CreateOrderInput, useCreateOrder } from "@/domains/commerce/queries/useCommerce";
import OrderingFooterActionBar from "@/domains/commerce/ui/ordering/OrderingFooterActionBar.vue";
import OrderingPageShell from "@/domains/commerce/ui/ordering/OrderingPageShell.vue";
import OrderingPriceDetailDrawer from "@/domains/commerce/ui/ordering/OrderingPriceDetailDrawer.vue";
import RentalOrderingForm from "@/domains/commerce/ui/ordering/RentalOrderingForm.vue";
import RideHailingOrderingContent from "@/domains/commerce/ui/ordering/RideHailingOrderingContent.vue";

type OrderingOfferDetail = OrderingEntryPayload["offerDetail"];
type OrderingDialogKind = "blocked";
type OrderingDialogState = {
  open: boolean;
  kind: OrderingDialogKind;
  title: string;
  description: string;
  confirmText: string;
  showCancel: boolean;
};
type OrderingActionProblem = {
  title?: string | null;
  detail?: string | null;
};

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
        typeof parsed.bindings === "object" && parsed.bindings !== null ? parsed.bindings : {},
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
const contentSummary = ref<OrderingContentSummary>({ price: null });
const listingRefreshKey = ref(0);
const priceDetailOpen = ref(false);
const orderingDialog = ref<OrderingDialogState>({
  open: false,
  kind: "blocked",
  title: "",
  description: "",
  confirmText: "我知道了",
  showCancel: false,
});

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

const buildOrderInput = (output: OrderingContentOutput | null): CreateOrderInput | null => {
  const entry = orderingEntry.value;
  if (!entry || !output) return null;
  return {
    prId: entry.prId ?? null,
    items: output.items,
  };
};

const createOrderInput = computed<CreateOrderInput | null>(() =>
  buildOrderInput(contentOutput.value),
);

const canCreate = computed(() => !!createOrderInput.value && !createOrderMutation.isPending.value);

const priceSummary = computed(() => contentSummary.value.price);

const priceExplanations = computed(() => priceSummary.value?.explanations ?? []);

const priceDisplayLabel = computed(() => {
  const range = priceSummary.value?.range ?? null;
  const rangePrices = range
    ? [range.minFen, range.maxFen].filter((value): value is number => typeof value === "number")
    : [];
  if (rangePrices.length > 0) {
    const min = Math.min(...rangePrices);
    const max = Math.max(...rangePrices);
    return min === max ? formatPriceAmount(min) : `${formatPriceAmount(min)}~${formatYuan(max)}`;
  }
  return formatPriceAmount(priceSummary.value?.totalFen ?? null);
});

const backFallbackTo = computed(() =>
  orderingEntry.value?.prId ? { path: `/pr/${orderingEntry.value.prId}` } : { path: "/" },
);

const formatYuan = (amountFen: number): string => (amountFen / 100).toFixed(2);

const formatPriceAmount = (amountFen: number | null | undefined): string =>
  typeof amountFen === "number"
    ? `￥${formatYuan(amountFen)}`
    : t("ordering.summary.currencyPending");

const openBlockedDialog = (problem: Partial<OrderingActionProblem>): void => {
  orderingDialog.value = {
    open: true,
    kind: "blocked",
    title: problem.title ?? "暂不能创建订单",
    description: problem.detail ?? "请稍后重试。",
    confirmText: "我知道了",
    showCancel: false,
  };
};

const closeOrderingDialog = (): void => {
  orderingDialog.value = {
    ...orderingDialog.value,
    open: false,
  };
};

const createOrderFromQuoteDraft = async (input: CreateOrderInput): Promise<void> => {
  try {
    const created = await createOrderMutation.mutateAsync(input);
    if (created.outcome === "CANCELLED") {
      openBlockedDialog({
        title: created.reason.title,
        detail: created.reason.detail,
      });
      return;
    }
    await router.push({ path: `/orders/${created.orderId}` });
  } catch (error) {
    closeOrderingDialog();
    const apiError = error as { code?: string; message?: string };
    if (apiError.code === "ORDERING_QUOTE_EXPIRED") {
      listingRefreshKey.value += 1;
      openBlockedDialog({
        title: "报价已过期",
        detail: apiError.message ?? "请确认刷新后的报价后重新下单。",
      });
      return;
    }
    openBlockedDialog({
      title: "暂不能创建订单",
      detail: error instanceof Error ? error.message : "请稍后重试。",
    });
  }
};

watch(
  () => orderingEntry.value?.offerDetail.productType,
  () => {
    contentOutput.value = null;
    contentSummary.value = { price: null };
    priceDetailOpen.value = false;
    closeOrderingDialog();
    createOrderMutation.reset();
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

const submitOrder = async (): Promise<void> => {
  const input = createOrderInput.value;
  if (!input) return;

  await createOrderFromQuoteDraft(input);
};

const handleOrderingDialogConfirm = async (): Promise<void> => {
  closeOrderingDialog();
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
}
</style>
