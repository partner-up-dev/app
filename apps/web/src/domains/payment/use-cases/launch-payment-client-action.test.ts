import assert from "node:assert/strict";
import { afterEach, test } from "vitest";
import { launchPaymentClientAction } from "./launch-payment-client-action";

const buildBridgeAction = (): Extract<
  Parameters<typeof launchPaymentClientAction>[0],
  { type: "WECHAT_BRIDGE" }
> => ({
  type: "WECHAT_BRIDGE",
  appId: "wx-dev-app",
  timeStamp: "1710000000",
  nonceStr: "fake-nonce",
  package: "prepay_id=fake_prepay_123",
  signType: "RSA",
  paySign: "fake-signature",
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
  Reflect.deleteProperty(globalThis, "document");
});

test("launchPaymentClientAction maps WeixinJSBridge cancel callback to CANCELLED", async () => {
  const bridge: WeixinJsBridgeApi = {
    invoke(_method, _payload, callback) {
      callback({
        err_msg: "get_brand_wcpay_request:cancel",
      });
    },
  };

  Object.assign(globalThis, {
    document: {},
    window: {
      WeixinJSBridge: bridge,
    },
  });

  const result = await launchPaymentClientAction(buildBridgeAction());

  assert.deepEqual(result, {
    clientKind: "WECHAT_BRIDGE",
    clientStatus: "CANCELLED",
    rawMessage: "get_brand_wcpay_request:cancel",
  });
});

test("launchPaymentClientAction returns redirect result after assigning location", async () => {
  const assignedUrls: string[] = [];

  Object.assign(globalThis, {
    window: {
      location: {
        assign(url: string) {
          assignedUrls.push(url);
        },
      },
    },
  });

  const result = await launchPaymentClientAction({
    type: "PAYMENT_REDIRECT",
    url: "https://payments.partner-up.localhost/checkout",
  });

  assert.deepEqual(assignedUrls, ["https://payments.partner-up.localhost/checkout"]);
  assert.deepEqual(result, {
    clientKind: "PAYMENT_REDIRECT",
    clientStatus: "REDIRECTED",
    rawMessage: null,
  });
});
