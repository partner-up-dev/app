// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createApp, type App } from "vue";
import { queryKeys } from "@/shared/api/query-keys";
import {
  readPaymentCheckoutAttemptHint,
  rememberPaymentCheckoutAttemptHint,
} from "@/domains/payment/use-cases/checkout-attempt-resume";
import type { PaymentTxResponse } from "@/domains/payment/queries/usePayment";
import PaymentCheckoutFlow from "./PaymentCheckoutFlow.vue";

const mocks = vi.hoisted(() => ({
  getPaymentProviders: vi.fn<(input: unknown, options?: unknown) => Promise<Response>>(),
  getPaymentTx: vi.fn<(input: unknown, options?: unknown) => Promise<Response>>(),
  routerReplace: vi.fn<(location: unknown) => Promise<void>>(),
}));

vi.mock("@/lib/rpc", () => ({
  client: {
    api: {
      payment: {
        providers: {
          $get: mocks.getPaymentProviders,
        },
        ":paymentTxId": {
          $get: mocks.getPaymentTx,
        },
        ":paymentProviderInstanceId": {
          charge: {
            $post: vi.fn<() => Promise<Response>>(),
          },
        },
      },
    },
  },
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({
    replace: mocks.routerReplace,
  }),
}));

vi.mock("@/shared/routing/useFallbackBack", () => ({
  useFallbackBack: () => ({ handleBack: vi.fn<() => void>() }),
}));

vi.mock("@/domains/commerce/queries/useCommerce", async () => {
  const { ref } = await vi.importActual<typeof import("vue")>("vue");

  return {
    useBillLineCheckoutTarget: () => ({
      data: ref({
        line: {
          id: "bill-line-1",
          label: "行程支付",
          description: "",
          amountFen: 1200,
          currency: "CNY",
          settlementStatus: "UNPAID",
        },
        bill: { id: "bill-1" },
        order: { id: "order-1" },
        eligibility: { payable: true, disabledReason: null },
      }),
      isError: ref(false),
      isPending: ref(false),
      error: ref(null),
    }),
  };
});

vi.mock("@partner-up-dev/design-web", async () => {
  const { ref } = await vi.importActual<typeof import("vue")>("vue");

  return {
    PuButton: {
      inheritAttrs: false,
      template:
        '<button v-bind="$attrs" @click="$emit(\'click\')"><slot name="leading" /><slot /></button>',
    },
    PuCell: {
      template: '<button><slot /><slot name="suffix" /></button>',
    },
    PuDialog: {
      props: ["open", "title", "description"],
      template: '<div v-if="open"><span>{{ title }}</span><span>{{ description }}</span><slot /></div>',
    },
    PuHeader: { template: '<header><slot name="leading" /></header>' },
    PuInlineNotice: {
      inheritAttrs: false,
      props: ["message"],
      template:
        '<div v-bind="$attrs"><span>{{ message }}</span><slot name="actions" /></div>',
    },
    PuLoadingState: { template: '<div />' },
    PuPageScaffold: {
      template:
        '<main><slot name="pageHeader" /><slot /><footer><slot name="footer" /></footer></main>',
    },
    PuRadio: { template: '<input type="radio" />' },
    usePuSelect: () => {
      const selectedValues = ref<string[]>([]);
      return {
        selectedValues,
        setValue: (value: string | undefined) => {
          selectedValues.value = value ? [value] : [];
        },
        select: (value: string) => {
          selectedValues.value = [value];
        },
        isDisabled: () => false,
      };
    },
  };
});

vi.mock("@/domains/payment/ui/primitives/PaymentCheckoutHero.vue", () => ({
  default: { template: '<div data-testid="payment-checkout.hero" />' },
}));

const failedPaymentTx: PaymentTxResponse = {
  paymentTxId: "payment-tx-1",
  status: "FAILED",
  billLineId: "bill-line-1",
  billId: "bill-1",
  orderId: "order-1",
  kind: "CHARGE",
  amountFen: 1200,
  currency: "CNY",
  attemptCount: 1,
  providerStatus: "PAYERROR",
  settledAt: null,
  provider: {
    paymentProviderInstanceId: "provider-1",
    label: "Test provider",
    providerType: "WECHAT_PAY",
    channel: "JSAPI",
  },
};

const mountedApps: Array<{ app: App<Element>; host: HTMLElement }> = [];

beforeEach(() => {
  sessionStorage.clear();
  mocks.getPaymentProviders.mockReset();
  mocks.getPaymentTx.mockReset();
  mocks.routerReplace.mockReset();
  mocks.getPaymentProviders.mockResolvedValue(
    new Response(JSON.stringify({ providers: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
});

afterEach(() => {
  for (const mounted of mountedApps.splice(0)) {
    mounted.app.unmount();
    mounted.host.remove();
  }
  sessionStorage.clear();
  document.body.innerHTML = "";
});

describe("PaymentCheckoutFlow PaymentTx reconciliation", () => {
  test("resumes a stored hint and retries a query error through the canonical cache", async () => {
    rememberPaymentCheckoutAttemptHint({
      billLineId: "bill-line-1",
      paymentTxId: failedPaymentTx.paymentTxId,
    });
    mocks.getPaymentTx
      .mockRejectedValueOnce(new Error("Provider query unavailable"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(failedPaymentTx), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const host = document.createElement("div");
    document.body.appendChild(host);
    const app = createApp(PaymentCheckoutFlow, { billLineId: "bill-line-1" });
    app.use(VueQueryPlugin, { queryClient });
    app.mount(host);
    mountedApps.push({ app, host });
    await vi.waitFor(() => {
      expect(host.textContent).toContain("Provider query unavailable");
    });

    expect(mocks.getPaymentTx).toHaveBeenCalledTimes(1);
    expect(readPaymentCheckoutAttemptHint({ billLineId: "bill-line-1" })).toEqual({
      billLineId: "bill-line-1",
      paymentTxId: failedPaymentTx.paymentTxId,
    });
    expect(host.querySelector('[data-testid="payment-checkout.reconcile-retry"]')).not.toBeNull();

    host
      .querySelector<HTMLButtonElement>('[data-testid="payment-checkout.reconcile-retry"]')
      ?.click();
    await vi.waitFor(() => {
      expect(host.textContent).toContain("支付失败");
    });

    expect(mocks.getPaymentTx).toHaveBeenCalledTimes(2);
    expect(
      queryClient.getQueryData(queryKeys.payment.tx(failedPaymentTx.paymentTxId)),
    ).toEqual(failedPaymentTx);
    expect(readPaymentCheckoutAttemptHint({ billLineId: "bill-line-1" })).toBeNull();
  });
});
