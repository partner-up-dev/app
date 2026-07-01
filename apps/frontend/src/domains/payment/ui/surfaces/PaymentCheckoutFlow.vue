<template>
  <PuPageScaffold
    viewport="screen"
    class="payment-checkout-page"
    data-testid="payment-checkout.page"
  >
    <template #pageHeader>
      <PuHeader
        title="支付"
        title-as="h1"
      >
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
      </PuHeader>
    </template>

    <div class="payment-checkout-page__body">
      <PuInlineNotice
        v-if="props.billLineId === null"
        tone="error"
        title="支付入口无效"
        message="缺少账单行编号。"
      />

      <PuInlineNotice
        v-else-if="targetQuery.isError.value"
        tone="error"
        title="无法加载支付信息"
        :message="targetErrorMessage"
      />

      <PuLoadingState
        v-else-if="targetQuery.isPending.value"
        title="正在加载支付信息"
        message="请稍候。"
        variant="soft"
        surface-level="section"
      />

      <div v-else-if="target" class="payment-checkout-page__content">
        <PaymentCheckoutHero
          :amount-label="amountLabel"
          :title="target.line.label"
          :description="lineDescription"
          :status-tag="statusTag"
        />

        <section class="payment-checkout-page__section" data-testid="payment-checkout.providers">
          <div class="payment-checkout-page__section-header">
            <h2 class="payment-checkout-page__section-title">支付方式</h2>
          </div>

          <PuInlineNotice
            v-if="errorNoticeMessage"
            class="payment-checkout-page__notice"
            tone="error"
            title="支付暂时不可用"
            :message="errorNoticeMessage"
            data-testid="payment-checkout.notice"
          />

          <PuInlineNotice
            v-if="providersQuery.isError.value"
            tone="error"
            title="无法加载支付方式"
            :message="providersErrorMessage"
          />

          <PuInlineNotice
            v-else-if="!target.eligibility.payable && target.eligibility.disabledReason"
            tone="warning"
            title="当前不可支付"
            :message="target.eligibility.disabledReason"
          />

          <PuLoadingState
            v-else-if="providersQuery.isPending.value"
            title="正在加载支付方式"
            compact
            variant="plain"
            surface-level="plain"
            align="start"
          />

          <PuInlineNotice
            v-else-if="providers.length === 0"
            tone="warning"
            title="暂无可用支付方式"
            message="请稍后再试。"
          />

          <div v-else class="payment-checkout-page__provider-list">
            <PuCell
              v-for="provider in providers"
              :key="provider.paymentProviderInstanceId"
              as="button"
              type="button"
              padding="md"
              class="payment-checkout-page__provider-cell"
              :class="{
                'is-selected': selectedProviderId === provider.paymentProviderInstanceId,
                'is-disabled': providerSelection.isDisabled(provider.paymentProviderInstanceId),
              }"
              :title="provider.label"
              :disabled="providerSelection.isDisabled(provider.paymentProviderInstanceId)"
              :aria-disabled="
                providerSelection.isDisabled(provider.paymentProviderInstanceId) ? 'true' : 'false'
              "
              data-testid="payment-checkout.provider-option"
              @click="providerSelection.select(provider.paymentProviderInstanceId)"
            >
              <template #suffix>
                <PuRadio
                  :model-value="selectedProviderId ?? undefined"
                  :value="provider.paymentProviderInstanceId"
                  :disabled="providerSelection.isDisabled(provider.paymentProviderInstanceId)"
                  name="payment-provider"
                  aria-label="选择支付方式"
                />
              </template>
            </PuCell>
          </div>
        </section>
      </div>
    </div>

    <template #footer>
      <div v-if="showsFooter" class="payment-checkout-page__footer">
        <PuButton
          shape="rect"
          tone="primary"
          variant="solid"
          size="lg"
          block
          :disabled="payDisabled"
          :loading="createPaymentChargeMutation.isPending.value"
          data-testid="payment-checkout.pay"
          @click="handlePay"
        >
          {{ payButtonLabel }}
        </PuButton>
      </div>
    </template>

    <PuDialog
      :open="isProgressDialogOpen"
      title="正在确认支付"
      aria-label="正在确认支付"
      :show-close="false"
      :show-cancel="false"
      :show-confirm="false"
      :close-on-overlay="false"
      :close-on-escape="false"
      tone="info"
    >
      <div class="payment-checkout-page__progress-dialog">
        <PuLoadingState
          label="正在确认支付"
          message="请稍候，不要重复发起支付。"
          align="start"
          surface-level="plain"
          variant="plain"
        />
      </div>
    </PuDialog>

    <PuDialog
      :open="dialogState.open"
      :title="dialogState.title"
      :description="dialogState.description"
      :confirm-text="dialogState.confirmText"
      :show-cancel="false"
      :show-confirm="true"
      tone="info"
      @close="closeDialog"
      @confirm="closeDialog"
    />
  </PuPageScaffold>
</template>

<script setup lang="ts">
import {
  PuButton,
  PuCell,
  PuDialog,
  PuHeader,
  PuInlineNotice,
  PuLoadingState,
  PuPageScaffold,
  PuRadio,
  usePuSelect,
} from "@partner-up-dev/design-web";
import { useQueryClient } from "@tanstack/vue-query";
import { computed, onScopeDispose, ref, toRef, watch } from "vue";
import { useRouter } from "vue-router";
import {
  formatCurrencyAmount,
  resolveBillLineSettlementTag,
} from "@/domains/commerce/model/bill-display";
import { useBillLineCheckoutTarget } from "@/domains/commerce/queries/useCommerce";
import {
  fetchPaymentTx,
  type PaymentTxResponse,
  useCreatePaymentCharge,
  usePaymentProviders,
} from "@/domains/payment/queries/usePayment";
import PaymentCheckoutHero from "@/domains/payment/ui/primitives/PaymentCheckoutHero.vue";
import {
  launchPaymentClientAction,
  type PaymentClientActionResult,
} from "@/domains/payment/use-cases/launch-payment-client-action";
import { queryKeys } from "@/shared/api/query-keys";
import { useFallbackBack } from "@/shared/routing/useFallbackBack";

type DialogState = {
  open: boolean;
  title: string;
  description: string;
  confirmText: string;
};
type PaymentAttemptPhase = "IDLE" | "WAITING_FOR_CLIENT" | "RECONCILING" | "SUCCEEDED";

const PAYMENT_TX_POLLING_MS = 1_500;
const PAYMENT_SUCCESS_RETURN_DELAY_MS = 1_200;

const props = defineProps<{
  billLineId: string | null;
}>();

const router = useRouter();
const queryClient = useQueryClient();
const billLineIdRef = toRef(props, "billLineId");

const targetQuery = useBillLineCheckoutTarget(billLineIdRef);
const providersQuery = usePaymentProviders();
const createPaymentChargeMutation = useCreatePaymentCharge();

const paymentTx = ref<PaymentTxResponse | null>(null);
const attemptPhase = ref<PaymentAttemptPhase>("IDLE");
const isReconcilingPaymentTx = ref(false);
const lastClientActionResult = ref<PaymentClientActionResult | null>(null);
const errorNoticeMessage = ref<string | null>(null);
const handledTerminalKey = ref<string | null>(null);
const dialogState = ref<DialogState>({
  open: false,
  title: "",
  description: "",
  confirmText: "我知道了",
});

let paymentTxPollingTimer: ReturnType<typeof setTimeout> | null = null;
let successReturnTimer: ReturnType<typeof setTimeout> | null = null;

const clearPaymentTxPollingTimer = (): void => {
  if (paymentTxPollingTimer === null) return;
  clearTimeout(paymentTxPollingTimer);
  paymentTxPollingTimer = null;
};

const clearSuccessReturnTimer = (): void => {
  if (successReturnTimer === null) return;
  clearTimeout(successReturnTimer);
  successReturnTimer = null;
};

onScopeDispose(() => {
  clearPaymentTxPollingTimer();
  clearSuccessReturnTimer();
});

const target = computed(() => targetQuery.data.value ?? null);
const providers = computed(() => providersQuery.data.value?.providers ?? []);

const backFallbackTo = computed(() =>
  target.value ? { path: `/bills/${target.value.bill.id}` } : { path: "/" },
);
const { handleBack } = useFallbackBack(backFallbackTo);

const targetErrorMessage = computed(() =>
  targetQuery.error.value instanceof Error ? targetQuery.error.value.message : "加载支付信息失败。",
);

const providersErrorMessage = computed(() =>
  providersQuery.error.value instanceof Error
    ? providersQuery.error.value.message
    : "加载支付方式失败。",
);

const selectableProviderIds = computed(() =>
  providers.value
    .filter((provider) => !provider.disabled)
    .map((provider) => provider.paymentProviderInstanceId),
);
const selectableProviderIdSet = computed(() => new Set(selectableProviderIds.value));

const isPaymentTxTerminal = (status: PaymentTxResponse["status"] | null | undefined): boolean =>
  status === "SUCCEEDED" || status === "FAILED" || status === "CLOSED";

const isPaymentTxNonTerminal = (status: PaymentTxResponse["status"] | null | undefined): boolean =>
  status === "ACTION_REQUIRED" || status === "PROCESSING";

const providerSelection = usePuSelect<string>({
  multiple: false,
  isOptionDisabled: (paymentProviderInstanceId) =>
    !selectableProviderIdSet.value.has(paymentProviderInstanceId) || selectionLocked.value,
});

watch(
  selectableProviderIds,
  (nextIds) => {
    const currentSelected = providerSelection.selectedValues.value[0];
    if (currentSelected && nextIds.includes(currentSelected)) return;
    providerSelection.setValue(nextIds[0]);
  },
  { immediate: true },
);

watch(
  billLineIdRef,
  () => {
    resetAttemptFeedback();
  },
);

const selectedProviderId = computed(() => providerSelection.selectedValues.value[0] ?? null);
const selectedProvider = computed(
  () =>
    providers.value.find(
      (provider) => provider.paymentProviderInstanceId === selectedProviderId.value,
    ) ?? null,
);

const amountLabel = computed(() =>
  target.value
    ? formatCurrencyAmount(target.value.line.amountFen, target.value.line.currency)
    : "待确认",
);

const currentStatus = computed<PaymentTxResponse["status"] | string>(
  () => paymentTx.value?.status ?? target.value?.line.settlementStatus ?? "UNPAID",
);

const statusTag = computed(() => resolveBillLineSettlementTag(currentStatus.value));

const lineDescription = computed(
  () => target.value?.line.description?.trim() || "请确认金额与支付方式后完成支付。",
);

const selectionLocked = computed(
  () =>
    createPaymentChargeMutation.isPending.value ||
    attemptPhase.value === "WAITING_FOR_CLIENT" ||
    attemptPhase.value === "RECONCILING" ||
    paymentTx.value?.status === "SUCCEEDED",
);

const isProgressDialogOpen = computed(() => attemptPhase.value === "RECONCILING");

const showsFooter = computed(() => target.value?.eligibility.payable === true);

const payDisabled = computed(() => {
  if (!target.value?.eligibility.payable) return true;
  if (providersQuery.isPending.value || providers.value.length === 0) return true;
  if (providersQuery.isError.value) return true;
  if (selectedProvider.value === null) return true;
  return selectionLocked.value;
});

const payButtonLabel = computed(() => {
  if (paymentTx.value?.status === "SUCCEEDED") return "支付成功";
  if (attemptPhase.value === "WAITING_FOR_CLIENT") return "请在微信中完成支付";
  if (attemptPhase.value === "RECONCILING") return "正在确认支付";
  if (providersQuery.isPending.value) return "正在加载支付方式";
  if (providers.value.length === 0) return "暂无可用支付方式";
  return `支付 ${amountLabel.value}`;
});

const closeDialog = (): void => {
  dialogState.value.open = false;
};

const openDialog = (input: Omit<DialogState, "open">): void => {
  dialogState.value = {
    open: true,
    ...input,
  };
};

const resetAttemptFeedback = (): void => {
  attemptPhase.value = "IDLE";
  paymentTx.value = null;
  lastClientActionResult.value = null;
  errorNoticeMessage.value = null;
  handledTerminalKey.value = null;
  clearPaymentTxPollingTimer();
  clearSuccessReturnTimer();
  closeDialog();
};

const schedulePaymentTxReconciliation = (): void => {
  clearPaymentTxPollingTimer();
  if (attemptPhase.value !== "RECONCILING") return;
  if (!isPaymentTxNonTerminal(paymentTx.value?.status)) return;
  paymentTxPollingTimer = setTimeout(() => {
    void reconcilePaymentTx();
  }, PAYMENT_TX_POLLING_MS);
};

const invalidateCheckoutQueries = async (): Promise<void> => {
  const checkoutTarget = target.value;
  if (!checkoutTarget) return;

  await queryClient.invalidateQueries({
    queryKey: queryKeys.commerce.billLineCheckoutTarget(checkoutTarget.line.id),
  });
  await queryClient.invalidateQueries({
    queryKey: queryKeys.commerce.billDetail(checkoutTarget.bill.id),
  });
  await queryClient.invalidateQueries({
    queryKey: queryKeys.commerce.orderDetail(checkoutTarget.order.id),
  });
  if (paymentTx.value) {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.payment.tx(paymentTx.value.paymentTxId),
    });
  }

  await Promise.all([
    queryClient.refetchQueries({
      queryKey: queryKeys.commerce.billLineCheckoutTarget(checkoutTarget.line.id),
      type: "all",
    }),
    queryClient.refetchQueries({
      queryKey: queryKeys.commerce.billDetail(checkoutTarget.bill.id),
      type: "all",
    }),
    queryClient.refetchQueries({
      queryKey: queryKeys.commerce.orderDetail(checkoutTarget.order.id),
      type: "all",
    }),
  ]);
};

const scheduleSuccessfulReturn = async (): Promise<void> => {
  const checkoutTarget = target.value;
  if (!checkoutTarget || successReturnTimer !== null) return;

  await invalidateCheckoutQueries();
  if (successReturnTimer !== null) return;
  successReturnTimer = setTimeout(() => {
    void router.replace({
      path: `/bills/${checkoutTarget.bill.id}`,
    });
  }, PAYMENT_SUCCESS_RETURN_DELAY_MS);
};

const buildTerminalDialog = (nextPaymentTx: PaymentTxResponse): Omit<DialogState, "open"> => {
  if (nextPaymentTx.status === "FAILED") {
    return {
      title: "支付失败",
      description: "当前支付未完成，请稍后重试。",
      confirmText: "我知道了",
    };
  }

  const wasCancelledByClient =
    lastClientActionResult.value?.clientKind === "WECHAT_BRIDGE" &&
    lastClientActionResult.value.clientStatus === "CANCELLED";
  return {
    title: wasCancelledByClient ? "支付已取消" : "支付已关闭",
    description: "本次支付未完成，请重新发起支付。",
    confirmText: "我知道了",
  };
};

const handlePaymentTxSnapshot = async (
  nextPaymentTx: PaymentTxResponse,
): Promise<PaymentTxResponse> => {
  paymentTx.value = nextPaymentTx;
  errorNoticeMessage.value = null;

  if (!isPaymentTxTerminal(nextPaymentTx.status)) {
    attemptPhase.value = "RECONCILING";
    schedulePaymentTxReconciliation();
    return nextPaymentTx;
  }

  clearPaymentTxPollingTimer();
  const terminalKey = `${nextPaymentTx.paymentTxId}:${nextPaymentTx.status}`;
  if (handledTerminalKey.value === terminalKey) {
    return nextPaymentTx;
  }
  handledTerminalKey.value = terminalKey;

  if (nextPaymentTx.status === "SUCCEEDED") {
    attemptPhase.value = "SUCCEEDED";
    await scheduleSuccessfulReturn();
    return nextPaymentTx;
  }

  attemptPhase.value = "IDLE";
  openDialog(buildTerminalDialog(nextPaymentTx));
  await invalidateCheckoutQueries();
  return nextPaymentTx;
};

const reconcilePaymentTx = async (): Promise<PaymentTxResponse | null> => {
  const paymentTxId = paymentTx.value?.paymentTxId ?? null;
  if (paymentTxId === null || isReconcilingPaymentTx.value) {
    return paymentTx.value;
  }

  isReconcilingPaymentTx.value = true;
  try {
    const nextPaymentTx = await fetchPaymentTx(paymentTxId);
    return await handlePaymentTxSnapshot(nextPaymentTx);
  } catch (error) {
    clearPaymentTxPollingTimer();
    attemptPhase.value = "IDLE";
    errorNoticeMessage.value =
      error instanceof Error ? error.message : "确认支付结果失败，请稍后重试。";
    return paymentTx.value;
  } finally {
    isReconcilingPaymentTx.value = false;
  }
};

const handlePay = async (): Promise<void> => {
  const checkoutTarget = target.value;
  const provider = selectedProvider.value;
  if (!checkoutTarget?.eligibility.payable || provider === null) {
    return;
  }

  resetAttemptFeedback();

  try {
    const result = await createPaymentChargeMutation.mutateAsync({
      paymentProviderInstanceId: provider.paymentProviderInstanceId,
      billLineId: checkoutTarget.line.id,
    });
    paymentTx.value = result.paymentTx;
    attemptPhase.value = "WAITING_FOR_CLIENT";
    const clientActionResult = await launchPaymentClientAction(result.clientAction);
    lastClientActionResult.value = clientActionResult;
    if (clientActionResult.clientKind === "PAYMENT_REDIRECT") {
      attemptPhase.value = "IDLE";
      return;
    }

    attemptPhase.value = "RECONCILING";
    await reconcilePaymentTx();
  } catch (error) {
    if (paymentTx.value !== null) {
      attemptPhase.value = "RECONCILING";
      await reconcilePaymentTx();
      return;
    }

    attemptPhase.value = "IDLE";
    const errorCode =
      error instanceof Error ? ("code" in error ? error.code : undefined) : undefined;
    if (errorCode === "PAYMENT_PROVIDER_CONFLICT") {
      openDialog({
        title: "支付方式不可切换",
        description: "当前账单行已有未完成支付，请先完成当前支付流程。",
        confirmText: "我知道了",
      });
      return;
    }

    errorNoticeMessage.value =
      error instanceof Error ? error.message : "发起支付失败，请稍后重试。";
  }
};
</script>

<style scoped lang="scss">
.payment-checkout-page {
  min-width: 0;
  --pu-page-max-width: 40rem;
}

.payment-checkout-page__body {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
}

.payment-checkout-page__content {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.payment-checkout-page__section {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.payment-checkout-page__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
}

.payment-checkout-page__section-title {
  @include mx.pu-font(section);
  margin: 0;
  color: var(--sys-color-on-surface);
}

.payment-checkout-page__notice {
  margin-bottom: var(--sys-spacing-xsmall);
}

.payment-checkout-page__provider-list {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.payment-checkout-page__provider-cell {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
  text-align: left;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.payment-checkout-page__provider-cell.is-selected {
  border-color: var(--sys-color-primary);
  background: var(--sys-color-primary-container);
}

.payment-checkout-page__provider-cell.is-disabled {
  opacity: 0.56;
}

.payment-checkout-page__footer {
  padding-top: var(--sys-spacing-small);
  padding-bottom: calc(var(--sys-spacing-medium) + env(safe-area-inset-bottom, 0px));
  background: var(--sys-color-surface);
}

.payment-checkout-page__progress-dialog {
  padding-bottom: var(--sys-spacing-small);
}
</style>
