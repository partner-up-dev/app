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

      <PuInlineNotice
        v-else-if="rentalOrdering"
        tone="info"
        title="租赁服务暂不可用"
        message="当前暂不开放租赁下单，请返回搭子请求或联系客服。"
        data-testid="ordering.rental.retired"
      />

      <RideHailingOrderingContent
        v-else-if="rideOrdering && orderingContentInput"
        :input="orderingContentInput"
        :listing-refresh-key="listingRefreshKey"
        :ordering-entry-refreshing="orderingEntryRefreshPending"
        @update:output="contentOutput = $event"
        @update:summary="contentSummary = $event"
        @resolve:blocker="handleRideListingBlocker"
        @refresh:ordering-entry="refreshOrderingEntryFromPlacementContext"
      />
    </div>

    <template #footer-action>
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
          rentalOrdering ? 'ordering.rental.price-detail' : 'ordering.ride-hailing.price-detail'
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
      :confirm-loading="orderingDialogConfirmLoading"
      tone="info"
      @close="closeOrderingDialog"
      @cancel="closeOrderingDialog"
      @confirm="handleOrderingDialogConfirm"
    />
  </OrderingPageShell>
</template>

<script setup lang="ts">
import { PuButton, PuDialog, PuInlineNotice } from "@partner-up-dev/design-web";
import { storeToRefs } from "pinia";
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import type {
  CreateOrderValue,
  OrderingContentInput,
  OrderingContentOutput,
  OrderingContentSummary,
} from "@/domains/commerce/model/ordering-content";
import type { OrderingEntryPayload } from "@/domains/commerce/model/ordering-entry-storage";
import {
  resolvePlacementOrderingEntry,
  useCreateOrder,
} from "@/domains/commerce/queries/useCommerce";
import OrderingFooterActionBar from "@/domains/commerce/ui/ordering/OrderingFooterActionBar.vue";
import OrderingPageShell from "@/domains/commerce/ui/ordering/OrderingPageShell.vue";
import OrderingPriceDetailDrawer from "@/domains/commerce/ui/ordering/OrderingPriceDetailDrawer.vue";
import RideHailingOrderingContent from "@/domains/commerce/ui/ordering/RideHailingOrderingContent.vue";
import type { RideHailingListingBlocker } from "@/domains/commerce/ui/ordering/ride-hailing-listing-state";
import { useOrderingHandoffStore } from "@/domains/commerce/use-cases/useOrderingHandoffStore";
import { useUpdatePRStatus } from "@/domains/pr/queries/usePRActions";
import { usePRDetail } from "@/domains/pr/queries/usePRDetail";

type OrderingOfferDetail = OrderingEntryPayload["offerDetail"];
type OrderingDialogKind =
  | "info"
  | "blocked-pr-not-ready"
  | "confirm-mark-pr-ready"
  | "go-to-my-bills"
  | "return-to-pr"
  | "contact-support";
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
const orderingHandoff = useOrderingHandoffStore();
const { orderingEntry } = storeToRefs(orderingHandoff);
const missingInput = computed(() => orderingEntry.value === null);

const createOrderMutation = useCreateOrder();
const createOrderIdempotencyKey = ref<string | null>(null);
const updatePrStatusMutation = useUpdatePRStatus();

const ordering = computed(() => orderingEntry.value?.offerDetail ?? null);
const orderingPrId = computed(() => orderingEntry.value?.prId ?? null);
const orderingPrDetailQuery = usePRDetail(orderingPrId);
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
const orderingEntryRefreshPending = ref(false);
const orderingDialog = ref<OrderingDialogState>({
  open: false,
  kind: "info",
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

const buildOrderInput = (output: OrderingContentOutput | null): CreateOrderValue | null => {
  const entry = orderingEntry.value;
  if (!entry || !output) return null;
  return {
    prId: entry.prId ?? null,
    items: output.items,
  };
};

const createOrderInput = computed<CreateOrderValue | null>(() =>
  buildOrderInput(contentOutput.value),
);

const canCreate = computed(
  () =>
    !!createOrderInput.value &&
    !createOrderMutation.isPending.value &&
    !orderingEntryRefreshPending.value,
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

const backFallbackTo = computed(() =>
  orderingEntry.value?.prId ? { path: `/pr/${orderingEntry.value.prId}` } : { path: "/" },
);
const orderingViewerIsCreator = computed(
  () => orderingPrDetailQuery.data.value?.partnerSection.viewer.isCreator === true,
);
const canOfferPrReadyRecovery = computed(
  () => orderingPrId.value !== null && orderingViewerIsCreator.value,
);
const orderingDialogConfirmLoading = computed(() =>
  orderingDialog.value.kind === "confirm-mark-pr-ready"
    ? updatePrStatusMutation.isPending.value
    : createOrderMutation.isPending.value,
);

const formatYuan = (amountFen: number): string => (amountFen / 100).toFixed(2);

const formatPriceAmount = (amountFen: number | null | undefined): string =>
  typeof amountFen === "number"
    ? `￥${formatYuan(amountFen)}`
    : t("ordering.summary.currencyPending");

const openBlockedDialog = (problem: Partial<OrderingActionProblem>): void => {
  orderingDialog.value = {
    open: true,
    kind: "info",
    title: problem.title ?? "暂不能创建订单",
    description: problem.detail ?? "请稍后重试。",
    confirmText: "我知道了",
    showCancel: false,
  };
};

const openPrNotReadyRecoveryDialog = (problem: Partial<OrderingActionProblem>): void => {
  orderingDialog.value = {
    open: true,
    kind: "blocked-pr-not-ready",
    title: problem.title ?? "暂不能创建订单",
    description: problem.detail ?? "创建订单需要搭子请求「已成团」或「进行中」",
    confirmText: "切换到已成团",
    showCancel: true,
  };
};

const openPrReadyConfirmationDialog = (): void => {
  orderingDialog.value = {
    open: true,
    kind: "confirm-mark-pr-ready",
    title: "确认标记为已成团？",
    description: "将当前搭子请求切换到「已成团」，此状态下不可以加入/退出。确认后请重新点击下单。",
    confirmText: "确认成团",
    showCancel: true,
  };
};

const openInfoDialog = (input: {
  title: string;
  description: string;
  confirmText?: string;
}): void => {
  orderingDialog.value = {
    open: true,
    kind: "info",
    title: input.title,
    description: input.description,
    confirmText: input.confirmText ?? "我知道了",
    showCancel: false,
  };
};

const openMyBillsDialog = (input: { title: string; description: string }): void => {
  orderingDialog.value = {
    open: true,
    kind: "go-to-my-bills",
    title: input.title,
    description: input.description,
    confirmText: "查看我的账单",
    showCancel: false,
  };
};

const openReturnToPrDialog = (input: {
  title: string;
  description: string;
  confirmText?: string;
}): void => {
  orderingDialog.value = {
    open: true,
    kind: "return-to-pr",
    title: input.title,
    description: input.description,
    confirmText: input.confirmText ?? "返回搭子请求",
    showCancel: true,
  };
};

const openContactSupportDialog = (input: {
  title: string;
  description: string;
  confirmText?: string;
}): void => {
  orderingDialog.value = {
    open: true,
    kind: "contact-support",
    title: input.title,
    description: input.description,
    confirmText: input.confirmText ?? "联系支持",
    showCancel: true,
  };
};

const closeOrderingDialog = (): void => {
  orderingDialog.value = {
    ...orderingDialog.value,
    open: false,
  };
};

const createOrderFromQuoteDraft = async (input: CreateOrderValue): Promise<void> => {
  const idempotencyKey = createOrderIdempotencyKey.value ?? crypto.randomUUID();
  createOrderIdempotencyKey.value = idempotencyKey;
  try {
    const created = await createOrderMutation.mutateAsync({ command: input, idempotencyKey });
    if (created.outcome === "CANCELLED") {
      createOrderIdempotencyKey.value = null;
      openBlockedDialog({
        title: created.reason.title,
        detail: created.reason.detail,
      });
      return;
    }
    createOrderIdempotencyKey.value = null;
    await router.replace({ path: `/orders/${created.orderId}` });
  } catch (error) {
    closeOrderingDialog();
    const apiError = error as { code?: string; message?: string };
    if (apiError.code === "ORDERING_QUOTE_EXPIRED") {
      createOrderIdempotencyKey.value = null;
      listingRefreshKey.value += 1;
      openBlockedDialog({
        title: "报价已过期",
        detail: apiError.message ?? "请确认刷新后的报价后重新下单。",
      });
      return;
    }
    if (apiError.code === "ORDERING_PARTICIPANT_UNPAID_ORDER_EXISTS") {
      createOrderIdempotencyKey.value = null;
      openMyBillsDialog({
        title: "参与者有未支付订单",
        description:
          apiError.message ?? "订单参与者中有人存在未支付订单，请先完成相关订单支付后再下单。",
      });
      return;
    }
    if (apiError.code === "PR_NOT_READY" && canOfferPrReadyRecovery.value) {
      createOrderIdempotencyKey.value = null;
      openPrNotReadyRecoveryDialog({
        title: "暂不能创建订单",
        detail: apiError.message ?? "创建订单需要搭子请求「已成团」或「进行中」",
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
    createOrderIdempotencyKey.value = null;
    contentOutput.value = null;
    contentSummary.value = { price: null };
    priceDetailOpen.value = false;
    closeOrderingDialog();
    createOrderMutation.reset();
    updatePrStatusMutation.reset();
  },
);

watch(
  createOrderInput,
  () => {
    createOrderIdempotencyKey.value = null;
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

const refreshOrderingEntryFromPlacementContext = async (): Promise<void> => {
  const placementContext = orderingEntry.value?.placementContext ?? null;
  if (!placementContext) {
    openReturnToPrDialog({
      title: "无法刷新下单信息",
      description: "当前下单入口缺少刷新上下文，请返回搭子请求后重新进入下单。",
    });
    return;
  }

  orderingEntryRefreshPending.value = true;
  try {
    const refreshedAdmission = await resolvePlacementOrderingEntry({
      placementInstanceId: placementContext.placementInstanceId,
      matchingContext: placementContext.matchingContext,
    });
    if (refreshedAdmission.outcome === "EXISTING_ORDER") {
      await router.replace({ path: `/orders/${refreshedAdmission.orderId}` });
      return;
    }
    if (refreshedAdmission.outcome !== "CREATOR_ELIGIBLE") {
      openReturnToPrDialog({
        title: "无法刷新下单信息",
        description:
          refreshedAdmission.outcome === "NON_CREATOR"
            ? "仅搭子发起人可以创建新订单，请返回搭子请求。"
            : "当前下单入口不可用，请返回搭子请求后重试。",
      });
      return;
    }
    orderingHandoff.setOrderingEntry({
      ...refreshedAdmission.orderingEntry,
      placementContext,
    });
  } catch (error) {
    openInfoDialog({
      title: "无法刷新下单信息",
      description: error instanceof Error ? error.message : "请稍后重试。",
    });
  } finally {
    orderingEntryRefreshPending.value = false;
  }
};

const handleRideListingBlocker = (blocker: RideHailingListingBlocker): void => {
  if (blocker.reason === "missing-riders" && canOfferPrReadyRecovery.value) {
    openPrNotReadyRecoveryDialog({
      title: blocker.title,
      detail: "当前没有可用于下单的搭子参与者。可以先将搭子请求切换到「已成团」，再重新进入下单。",
    });
    return;
  }

  if (blocker.reason === "missing-route" || blocker.reason === "missing-riders") {
    openReturnToPrDialog({
      title: blocker.title,
      description:
        blocker.reason === "missing-route"
          ? "请回到搭子请求补全上车点和目的地，再重新进入下单。"
          : "请回到搭子请求确认成员和状态，再重新进入下单。",
    });
    return;
  }

  if (blocker.reason === "missing-offer") {
    openContactSupportDialog({
      title: blocker.title,
      description: blocker.message,
    });
    return;
  }

  openInfoDialog({
    title: blocker.title,
    description: blocker.message,
  });
};

const markCurrentPrReady = async (): Promise<void> => {
  const prId = orderingPrId.value;
  if (prId === null) {
    closeOrderingDialog();
    openInfoDialog({
      title: "无法修改成团状态",
      description: "当前订单入口没有关联 PR。",
    });
    return;
  }

  try {
    await updatePrStatusMutation.mutateAsync({
      id: prId,
      status: "READY",
    });
    closeOrderingDialog();
    await nextTick();
    openInfoDialog({
      title: "已成团",
      description: "PR 已标记为已成团，请重新点击下单。",
    });
  } catch (error) {
    closeOrderingDialog();
    await nextTick();
    openInfoDialog({
      title: "无法修改成团状态",
      description: error instanceof Error ? error.message : "请稍后重试。",
    });
  }
};

const handleOrderingDialogConfirm = async (): Promise<void> => {
  if (orderingDialog.value.kind === "blocked-pr-not-ready") {
    closeOrderingDialog();
    await nextTick();
    openPrReadyConfirmationDialog();
    return;
  }

  if (orderingDialog.value.kind === "return-to-pr") {
    closeOrderingDialog();
    await router.push(backFallbackTo.value);
    return;
  }

  if (orderingDialog.value.kind === "go-to-my-bills") {
    closeOrderingDialog();
    await router.push({
      path: "/bills",
      query: {
        source: "ordering-blocked-unpaid",
      },
    });
    return;
  }

  if (orderingDialog.value.kind === "contact-support") {
    closeOrderingDialog();
    await router.push({ name: "contact-support" });
    return;
  }

  if (orderingDialog.value.kind === "confirm-mark-pr-ready") {
    await markCurrentPrReady();
    return;
  }

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
