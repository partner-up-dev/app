<template>
  <PuPageScaffold
    viewport="screen"
    class="payment-checkout-page"
    data-testid="payment-checkout.page"
  >
    <template #header>
      <PageHeader
        title="支付"
        subtitle="本页只支付当前这一条账单行"
        :back-fallback-to="backFallbackTo"
      />
    </template>

    <div class="payment-checkout-page__body">
      <PuInlineNotice
        v-if="billLineId === null"
        tone="error"
        title="支付入口无效"
        message="缺少账单行编号。"
      />

      <PuInlineNotice
        v-else-if="checkoutQuery.isError.value"
        tone="error"
        title="无法加载支付信息"
        :message="checkoutErrorMessage"
      />

      <div
        v-else-if="checkoutQuery.isPending.value"
        class="payment-checkout-page__loading"
      >
        正在加载支付信息...
      </div>

      <template v-else-if="checkout">
        <PuCard as="section" gap="md">
          <div class="payment-checkout-page__section-heading">
            <p class="payment-checkout-page__eyebrow">Checkout</p>
            <h2>{{ checkout.order.itemName }}</h2>
          </div>

          <div class="payment-checkout-page__amount">
            <span>{{ checkout.billLine.label }}</span>
            <strong data-testid="payment-checkout.amount">
              {{ formatFen(checkout.billLine.amountFen) }}
            </strong>
          </div>

          <p
            class="payment-checkout-page__status"
            data-testid="payment-checkout.status"
          >
            支付状态：{{ paymentStatusLabel }}
          </p>
        </PuCard>

        <PuCard as="section" gap="md">
          <div class="payment-checkout-page__section-heading">
            <p class="payment-checkout-page__eyebrow">Provider</p>
            <h2>微信支付</h2>
          </div>

          <PuInlineNotice
            v-if="
              !checkout.eligibility.payable &&
              activePayment?.status !== 'SUCCEEDED'
            "
            tone="warning"
            title="当前不可支付"
            :message="checkout.eligibility.disabledReason ?? '支付条件不满足。'"
          />

          <Button
            v-if="canCreateCharge"
            size="lg"
            :loading="createChargeMutation.isPending.value"
            data-testid="payment-checkout.create-charge"
            @click="createCharge"
          >
            发起微信支付
          </Button>

          <template
            v-if="activePayment && activePayment.status !== 'SUCCEEDED'"
          >
            <Button
              v-if="
                activePaymentClientActionType === 'PAYMENT_REDIRECT' &&
                redirectUrl
              "
              tone="secondary"
              data-testid="payment-checkout.redirect-open"
              @click="openRedirectPayment"
            >
              继续支付
            </Button>
            <Button
              v-if="activePaymentClientActionType === 'WECHAT_BRIDGE'"
              tone="secondary"
              data-testid="payment-checkout.wechat-bridge-open"
              @click="runActiveClientPaymentAction"
            >
              继续微信支付
            </Button>
            <Button
              v-if="activePaymentClientActionType !== 'PAYMENT_REDIRECT'"
              tone="secondary"
              :loading="syncMutation.isPending.value"
              data-testid="payment-checkout.sync"
              @click="syncPayment"
            >
              同步支付状态
            </Button>
          </template>

          <PuInlineNotice
            v-if="activePayment?.status === 'SUCCEEDED'"
            tone="success"
            title="支付成功"
            message="后端已确认该账单行支付成功。"
            data-testid="payment-checkout.success"
          />

          <PuInlineNotice
            v-if="
              createChargeMutation.isError.value || syncMutation.isError.value
            "
            tone="error"
            title="支付处理失败"
            :message="mutationErrorMessage"
          />

          <PuInlineNotice
            v-if="clientPaymentError"
            tone="error"
            title="微信支付未完成"
            :message="clientPaymentError"
            data-testid="payment-checkout.client-error"
          />
        </PuCard>

        <PuCard as="section" gap="sm" padding="sm" variant="outline">
          <PuButton
            :action="{ to: { path: `/bills/${checkout.bill.id}` } }"
            shape="rect"
            tone="primary"
            variant="outline"
            data-testid="payment-checkout.bill-link"
          >
            返回账单
          </PuButton>
        </PuCard>
      </template>
    </div>
  </PuPageScaffold>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import {
  PuButton,
  PuCard,
  PuInlineNotice,
  PuPageScaffold,
} from "@partner-up-dev/design-web";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import Button from "@/shared/ui/actions/Button.vue";
import {
  useCreateChargeForBillLine,
  usePaymentCheckout,
  useSyncPaymentTx,
} from "@/domains/commerce/queries/useCommerce";

const route = useRoute();

const billLineId = computed(() => {
  const value = route.params.billLineId;
  if (typeof value !== "string" || value.length === 0) return null;
  return value;
});

const checkoutQuery = usePaymentCheckout(billLineId);
const createChargeMutation = useCreateChargeForBillLine();
const syncMutation = useSyncPaymentTx();
const clientPaymentError = ref<string | null>(null);

type WeChatBridgeClientAction = {
  type: "WECHAT_BRIDGE";
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: "RSA";
  paySign: string;
};

type PaymentRedirectClientAction = {
  type: "PAYMENT_REDIRECT";
  url: string;
};

type PaymentClientAction =
  | WeChatBridgeClientAction
  | PaymentRedirectClientAction;

type WeixinJSBridgeResponse = {
  err_msg?: string;
};

type WeixinJSBridgeLike = {
  invoke(
    method: "getBrandWCPayRequest",
    payload: Omit<WeChatBridgeClientAction, "type">,
    callback: (response: WeixinJSBridgeResponse) => void,
  ): void;
};

declare global {
  interface Window {
    WeixinJSBridge?: WeixinJSBridgeLike;
  }
}

const checkout = computed(
  () => createChargeMutation.data.value ?? checkoutQuery.data.value ?? null,
);

const activePayment = computed(
  () =>
    syncMutation.data.value ??
    createChargeMutation.data.value?.payment ??
    checkoutQuery.data.value?.payment ??
    null,
);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (
  record: Record<string, unknown>,
  key: string,
): string | null => {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
};

const parsePaymentClientAction = (
  value: unknown,
): PaymentClientAction | null => {
  if (!isRecord(value)) return null;
  const type = readString(value, "type");

  if (type === "WECHAT_BRIDGE") {
    const appId = readString(value, "appId");
    const timeStamp = readString(value, "timeStamp");
    const nonceStr = readString(value, "nonceStr");
    const packageValue = readString(value, "package");
    const paySign = readString(value, "paySign");
    if (!appId || !timeStamp || !nonceStr || !packageValue || !paySign) {
      return null;
    }
    return {
      type,
      appId,
      timeStamp,
      nonceStr,
      package: packageValue,
      signType: "RSA",
      paySign,
    };
  }

  if (type === "PAYMENT_REDIRECT") {
    const url = readString(value, "url");
    return url ? { type, url } : null;
  }

  return null;
};

const activePaymentClientAction = computed(() =>
  parsePaymentClientAction(activePayment.value?.clientAction),
);

const activePaymentClientActionType = computed(
  () => activePaymentClientAction.value?.type ?? null,
);

const redirectUrl = computed(() =>
  activePaymentClientAction.value?.type === "PAYMENT_REDIRECT"
    ? activePaymentClientAction.value.url
    : null,
);

const canCreateCharge = computed(
  () => checkout.value?.eligibility.payable === true && !activePayment.value,
);

const paymentStatusLabel = computed(() => {
  if (!activePayment.value) return "未发起";
  if (activePayment.value.status === "SUCCEEDED") return "已支付";
  if (activePayment.value.status === "ACTION_REQUIRED") return "待完成支付";
  if (activePayment.value.status === "PROCESSING") return "支付处理中";
  if (activePayment.value.status === "FAILED") return "支付失败";
  if (activePayment.value.status === "CLOSED") return "已关闭";
  return activePayment.value.status;
});

const backFallbackTo = computed(() =>
  checkout.value ? { path: `/bills/${checkout.value.bill.id}` } : { path: "/" },
);

const checkoutErrorMessage = computed(() =>
  checkoutQuery.error.value instanceof Error
    ? checkoutQuery.error.value.message
    : "加载支付信息失败。",
);

const mutationErrorMessage = computed(() => {
  const error = createChargeMutation.error.value ?? syncMutation.error.value;
  return error instanceof Error ? error.message : "支付处理失败。";
});

const createCharge = async (): Promise<void> => {
  if (!billLineId.value) return;
  clientPaymentError.value = null;
  const result = await createChargeMutation.mutateAsync(billLineId.value);
  await runClientPaymentAction(result.payment?.clientAction);
};

const syncPayment = async (): Promise<void> => {
  const paymentTxId = activePayment.value?.id;
  if (!paymentTxId) return;
  await syncMutation.mutateAsync(paymentTxId);
};

const runClientPaymentAction = async (value: unknown): Promise<void> => {
  const action = parsePaymentClientAction(value);
  if (!action) {
    return;
  }

  if (action.type === "PAYMENT_REDIRECT") {
    window.location.assign(action.url);
    return;
  }

  try {
    await invokeWeChatBridgePayment(action);
    await syncPayment();
  } catch (error) {
    clientPaymentError.value =
      error instanceof Error ? error.message : "微信支付调用失败。";
  }
};

const invokeWeChatBridgePayment = (
  action: WeChatBridgeClientAction,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const bridge = window.WeixinJSBridge;
    if (!bridge) {
      reject(new Error("当前环境缺少 WeixinJSBridge，无法拉起微信支付。"));
      return;
    }

    bridge.invoke(
      "getBrandWCPayRequest",
      {
        appId: action.appId,
        timeStamp: action.timeStamp,
        nonceStr: action.nonceStr,
        package: action.package,
        signType: action.signType,
        paySign: action.paySign,
      },
      (response) => {
        const message = response.err_msg ?? "";
        if (message.endsWith(":ok")) {
          resolve();
          return;
        }
        reject(new Error(message || "用户未完成微信支付。"));
      },
    );
  });

const openRedirectPayment = (): void => {
  if (!redirectUrl.value) return;
  window.location.assign(redirectUrl.value);
};

const runActiveClientPaymentAction = async (): Promise<void> => {
  clientPaymentError.value = null;
  await runClientPaymentAction(activePayment.value?.clientAction);
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
.payment-checkout-page {
  min-width: 0;
  --pu-page-max-width: 40rem;
}

.payment-checkout-page__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  min-height: 0;
  overflow: auto;
  padding-bottom: var(--sys-spacing-medium);
}

.payment-checkout-page__loading,
.payment-checkout-page__status {
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

.payment-checkout-page__section-heading {
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

.payment-checkout-page__eyebrow {
  @include mx.pu-font(control);
  color: var(--sys-color-primary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.payment-checkout-page__amount {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-medium);
  padding: var(--sys-spacing-medium);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface-container-high);

  span {
    color: var(--sys-color-on-surface-variant);
  }

  strong {
    @include mx.pu-font(title);
    color: var(--sys-color-on-surface);
  }
}
</style>
