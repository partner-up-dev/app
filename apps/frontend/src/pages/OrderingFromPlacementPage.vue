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
        @update:output="contentOutput = $event"
        @update:summary="contentSummary = $event"
      />

      <RideHailingOrderingContent
        v-else-if="rideOrdering && orderingContentInput"
        :input="orderingContentInput"
        @update:output="contentOutput = $event"
        @update:summary="contentSummary = $event"
      />
    </div>

    <template #footer-action>
      <OrderingFooterActionBar
        v-if="rentalOrdering"
        :amount-label="priceDisplayLabel"
        :can-create="canCreate"
        :loading="createOrderMutation.isPending.value || evaluateMutation.isPending.value"
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
        :loading="createOrderMutation.isPending.value || evaluateMutation.isPending.value"
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

    <PuDialog
      :open="preflightDialog.open"
      :title="preflightDialog.title"
      :description="preflightDialog.description"
      :confirm-text="preflightDialog.confirmText"
      cancel-text="取消"
      :show-cancel="preflightDialog.showCancel"
      :show-confirm="true"
      :confirm-loading="createOrderMutation.isPending.value"
      :tone="preflightDialog.kind === 'price-change' ? 'warning' : 'info'"
      data-testid="ordering.preflight-dialog"
      @close="closePreflightDialog"
      @cancel="closePreflightDialog"
      @confirm="handlePreflightDialogConfirm"
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
import {
  type CreateOrderInput,
  type OrderingEvaluationResponse,
  useCreateOrder,
  useEvaluateOrdering,
} from "@/domains/commerce/queries/useCommerce";
import OrderingFloatingNoticeLayer from "@/domains/commerce/ui/ordering/OrderingFloatingNoticeLayer.vue";
import OrderingFooterActionBar from "@/domains/commerce/ui/ordering/OrderingFooterActionBar.vue";
import OrderingPageShell from "@/domains/commerce/ui/ordering/OrderingPageShell.vue";
import OrderingPriceDetailDrawer from "@/domains/commerce/ui/ordering/OrderingPriceDetailDrawer.vue";
import RentalOrderingForm from "@/domains/commerce/ui/ordering/RentalOrderingForm.vue";
import RideHailingOrderingContent from "@/domains/commerce/ui/ordering/RideHailingOrderingContent.vue";

type OrderingOfferDetail = OrderingEntryPayload["offerDetail"];
type PreflightDialogKind = "blocked" | "price-change";
type PreflightDialogState = {
  open: boolean;
  kind: PreflightDialogKind;
  title: string;
  description: string;
  confirmText: string;
  showCancel: boolean;
  pendingInput: CreateOrderInput | null;
};
type OrderingActionProblem = NonNullable<
  OrderingEvaluationResponse["actions"]["create_order"]["problem"]
>;

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
const contentSummary = ref<OrderingContentSummary>({ price: null });
const priceDetailOpen = ref(false);
const preflightDialog = ref<PreflightDialogState>({
  open: false,
  kind: "blocked",
  title: "",
  description: "",
  confirmText: "我知道了",
  showCancel: false,
  pendingInput: null,
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

const createOrderErrorMessage = computed(() =>
  createOrderMutation.error.value instanceof Error ? createOrderMutation.error.value.message : null,
);

const canCreate = computed(
  () =>
    !!createOrderInput.value &&
    !createOrderMutation.isPending.value &&
    !evaluateMutation.isPending.value,
);

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

const floatingNoticeMessage = computed(() => createOrderErrorMessage.value);

const floatingNoticeTone = computed<"warning" | "error">(() =>
  createOrderErrorMessage.value ? "error" : "warning",
);

const backFallbackTo = computed(() =>
  orderingEntry.value?.prId ? { path: `/pr/${orderingEntry.value.prId}` } : { path: "/" },
);

const formatYuan = (amountFen: number): string => (amountFen / 100).toFixed(2);

const formatPriceAmount = (amountFen: number | null | undefined): string =>
  typeof amountFen === "number"
    ? `￥${formatYuan(amountFen)}`
    : t("ordering.summary.currencyPending");

const openBlockedDialog = (problem: Partial<OrderingActionProblem>): void => {
  preflightDialog.value = {
    open: true,
    kind: "blocked",
    title: problem.title ?? "暂不能创建订单",
    description: problem.detail ?? "请稍后重试。",
    confirmText: "我知道了",
    showCancel: false,
    pendingInput: null,
  };
};

type ComparablePrice = NonNullable<OrderingContentSummary["price"]>;
type PriceRangeTuple = readonly [number, number];

const comparableRange = (price: ComparablePrice | null): PriceRangeTuple | null => {
  const range = price?.range ?? null;
  const rangePrices = range
    ? [range.minFen, range.maxFen].filter((value): value is number => typeof value === "number")
    : [];
  if (rangePrices.length > 0) {
    return [Math.min(...rangePrices), Math.max(...rangePrices)];
  }
  return typeof price?.totalFen === "number" ? [price.totalFen, price.totalFen] : null;
};

const formatPriceComparable = (price: ComparablePrice | null): string => {
  const range = comparableRange(price);
  if (!range) return formatPriceAmount(null);
  const [min, max] = range;
  return min === max ? formatPriceAmount(min) : `${formatPriceAmount(min)}~${formatYuan(max)}`;
};

const openPriceChangeDialog = (
  input: CreateOrderInput,
  evaluation: OrderingEvaluationResponse,
): void => {
  preflightDialog.value = {
    open: true,
    kind: "price-change",
    title: "价格发生变化",
    description: `当前价格已从 ${formatPriceComparable(
      priceSummary.value,
    )} 更新为 ${formatPriceComparable(evaluation.price)}。是否继续下单？`,
    confirmText: "继续下单",
    showCancel: true,
    pendingInput: input,
  };
};

const closePreflightDialog = (): void => {
  preflightDialog.value = {
    ...preflightDialog.value,
    open: false,
    pendingInput: null,
  };
};

const shouldConfirmPriceChange = (evaluation: OrderingEvaluationResponse): boolean => {
  const displayedRange = comparableRange(priceSummary.value);
  const evaluatedRange = comparableRange(evaluation.price);
  return (
    displayedRange !== null &&
    evaluatedRange !== null &&
    (displayedRange[0] !== evaluatedRange[0] || displayedRange[1] !== evaluatedRange[1])
  );
};

const createOrderAfterPreflight = async (input: CreateOrderInput): Promise<void> => {
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
  } catch {
    closePreflightDialog();
  }
};

watch(
  () => orderingEntry.value?.offerDetail.productType,
  () => {
    contentOutput.value = null;
    contentSummary.value = { price: null };
    priceDetailOpen.value = false;
    closePreflightDialog();
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

const submitOrder = async (): Promise<void> => {
  const input = createOrderInput.value;
  if (!input) return;

  try {
    const evaluation = await evaluateMutation.mutateAsync(input);
    const createOrderDecision = evaluation.actions.create_order;
    if (!createOrderDecision.allowed) {
      openBlockedDialog(createOrderDecision.problem);
      return;
    }
    if (shouldConfirmPriceChange(evaluation)) {
      openPriceChangeDialog(input, evaluation);
      return;
    }
    await createOrderAfterPreflight(input);
  } catch (error) {
    openBlockedDialog({
      title: "暂不能创建订单",
      detail: error instanceof Error ? error.message : "请稍后重试。",
    });
  }
};

const handlePreflightDialogConfirm = async (): Promise<void> => {
  if (preflightDialog.value.kind !== "price-change") {
    closePreflightDialog();
    return;
  }
  const input = preflightDialog.value.pendingInput;
  if (!input) {
    closePreflightDialog();
    return;
  }
  await createOrderAfterPreflight(input);
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
