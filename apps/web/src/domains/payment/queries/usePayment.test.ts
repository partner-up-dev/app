// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createApp, defineComponent, nextTick, ref, type App } from "vue";
import { queryKeys } from "@/shared/api/query-keys";
import { type PaymentTxResponse, usePaymentTx } from "./usePayment";

const mocks = vi.hoisted(() => ({
  getPaymentTx: vi.fn<(input: unknown, options?: unknown) => Promise<Response>>(),
}));

vi.mock("@/lib/rpc", () => ({
  client: {
    api: {
      payment: {
        ":paymentTxId": {
          $get: mocks.getPaymentTx,
        },
      },
    },
  },
}));

const buildPaymentTx = (
  status: PaymentTxResponse["status"],
  paymentTxId = "payment-tx-1",
): PaymentTxResponse => ({
  paymentTxId,
  status,
  billLineId: "bill-line-1",
  billId: "bill-1",
  orderId: "order-1",
  kind: "CHARGE",
  amountFen: 1200,
  currency: "CNY",
  attemptCount: 1,
  providerStatus: status,
  settledAt: status === "SUCCEEDED" ? "2026-07-20T00:00:00.000Z" : null,
  provider: {
    paymentProviderInstanceId: "provider-1",
    label: "Test provider",
    providerType: "WECHAT_PAY",
    channel: "JSAPI",
  },
});

const mountedApps: App<Element>[] = [];

beforeEach(() => {
  mocks.getPaymentTx.mockReset();
});

afterEach(() => {
  for (const app of mountedApps.splice(0)) app.unmount();
  document.body.innerHTML = "";
});

describe("PaymentTx query authority", () => {
  test("seeds and reconciles through one canonical TanStack query key", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const paymentTxId = ref<string | null>(null);
    let paymentTxQuery: ReturnType<typeof usePaymentTx> | undefined;
    const app = createApp(
      defineComponent({
        setup() {
          paymentTxQuery = usePaymentTx(paymentTxId);
          return () => null;
        },
      }),
    );
    app.use(VueQueryPlugin, { queryClient });
    app.mount(document.createElement("div"));
    mountedApps.push(app);

    const actionRequired = buildPaymentTx("ACTION_REQUIRED");
    paymentTxId.value = actionRequired.paymentTxId;
    paymentTxQuery?.seed(actionRequired);
    await nextTick();

    expect(paymentTxQuery?.data.value).toEqual(actionRequired);
    expect(queryClient.getQueryData(queryKeys.payment.tx(actionRequired.paymentTxId))).toEqual(
      actionRequired,
    );
    expect(mocks.getPaymentTx).not.toHaveBeenCalled();

    const succeeded = buildPaymentTx("SUCCEEDED");
    mocks.getPaymentTx.mockResolvedValue(
      new Response(JSON.stringify(succeeded), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(paymentTxQuery?.reconcile(actionRequired.paymentTxId)).resolves.toEqual(succeeded);
    await nextTick();

    expect(mocks.getPaymentTx).toHaveBeenCalledTimes(1);
    expect(paymentTxQuery?.data.value).toEqual(succeeded);
    expect(queryClient.getQueryData(queryKeys.payment.tx(actionRequired.paymentTxId))).toEqual(
      succeeded,
    );
  });
});
