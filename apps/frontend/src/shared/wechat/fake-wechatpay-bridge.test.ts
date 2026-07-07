import assert from "node:assert/strict";
import { test } from "vitest";
import { installFakeWeChatPayBridgeForTesting } from "./fake-wechatpay-bridge";

const buildBridgePayload = (): WeChatPayBridgePayload => ({
  appId: "fake-app-id",
  timeStamp: "1710000000",
  nonceStr: "fake-nonce",
  package: "prepay_id=fake_prepay_123",
  signType: "RSA",
  paySign: "fake-signature",
});

test("fake WeChatPay bridge installs and completes JSAPI happy path", async () => {
  const dispatchedEvents: string[] = [];
  const fetchCalls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const bridgeWindow: Pick<Window, "WeixinJSBridge"> = {};
  const bridgeDocument = {
    dispatchEvent(event: Event) {
      dispatchedEvents.push(event.type);
      return true;
    },
  };

  const installed = installFakeWeChatPayBridgeForTesting({
    bridgeWindow,
    bridgeDocument,
    fakeWeChatPayOrigin: "https://wechatpay.localhost",
    fetchImpl: async (url, init) => {
      fetchCalls.push({
        url: String(url),
        init,
      });
      return new Response("{}", { status: 200 });
    },
    presentPaymentClient: async () => "SUCCESS",
    scheduleTask: (task) => task(),
  });

  assert.equal(installed, true);
  assert.deepEqual(dispatchedEvents, ["WeixinJSBridgeReady"]);
  assert.ok(bridgeWindow.WeixinJSBridge);

  const response = await new Promise<WeixinJsBridgeCallbackPayload>((resolve) => {
    bridgeWindow.WeixinJSBridge?.invoke("getBrandWCPayRequest", buildBridgePayload(), resolve);
  });

  assert.equal(response.err_msg, "get_brand_wcpay_request:ok");
  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0]?.url,
    "https://wechatpay.localhost/__fake_wechatpay/prepays/fake_prepay_123/succeed",
  );
  assert.equal(fetchCalls[0]?.init?.method, "POST");
});

test("fake WeChatPay bridge rejects unsupported bridge methods", async () => {
  const bridgeWindow: Pick<Window, "WeixinJSBridge"> = {};

  installFakeWeChatPayBridgeForTesting({
    bridgeWindow,
    bridgeDocument: {
      dispatchEvent() {
        return true;
      },
    },
    fakeWeChatPayOrigin: "https://wechatpay.localhost",
    fetchImpl: async () => {
      throw new Error("fetch should not be called");
    },
    presentPaymentClient: async () => "SUCCESS",
    scheduleTask: (task) => task(),
  });

  const response = await new Promise<WeixinJsBridgeCallbackPayload>((resolve) => {
    bridgeWindow.WeixinJSBridge?.invoke("chooseWXPay", buildBridgePayload(), resolve);
  });

  assert.equal(response.err_msg, "chooseWXPay:fail");
});

test("fake WeChatPay bridge does not override an existing bridge", () => {
  let existingInvokeCalls = 0;
  const existingBridge: WeixinJsBridgeApi = {
    invoke(_method, _payload, callback) {
      existingInvokeCalls += 1;
      callback({
        err_msg: "existing:ok",
      });
    },
  };
  const bridgeWindow: Pick<Window, "WeixinJSBridge"> = {
    WeixinJSBridge: existingBridge,
  };
  const dispatchedEvents: string[] = [];

  const installed = installFakeWeChatPayBridgeForTesting({
    bridgeWindow,
    bridgeDocument: {
      dispatchEvent(event: Event) {
        dispatchedEvents.push(event.type);
        return true;
      },
    },
    fakeWeChatPayOrigin: "https://wechatpay.localhost",
    fetchImpl: async () => new Response("{}", { status: 200 }),
    presentPaymentClient: async () => "SUCCESS",
    scheduleTask: (task) => task(),
  });

  assert.equal(installed, false);
  assert.equal(bridgeWindow.WeixinJSBridge, existingBridge);
  assert.deepEqual(dispatchedEvents, []);

  bridgeWindow.WeixinJSBridge?.invoke("getBrandWCPayRequest", buildBridgePayload(), () => {});
  assert.equal(existingInvokeCalls, 1);
});

test("fake WeChatPay bridge reports invalid prepay packages as failure", async () => {
  const bridgeWindow: Pick<Window, "WeixinJSBridge"> = {};

  installFakeWeChatPayBridgeForTesting({
    bridgeWindow,
    bridgeDocument: {
      dispatchEvent() {
        return true;
      },
    },
    fakeWeChatPayOrigin: "https://wechatpay.localhost",
    fetchImpl: async () => new Response("{}", { status: 200 }),
    presentPaymentClient: async () => "SUCCESS",
    scheduleTask: (task) => task(),
  });

  const response = await new Promise<WeixinJsBridgeCallbackPayload>((resolve) => {
    bridgeWindow.WeixinJSBridge?.invoke(
      "getBrandWCPayRequest",
      {
        ...buildBridgePayload(),
        package: "invalid-package",
      },
      resolve,
    );
  });

  assert.match(
    response.err_msg ?? "",
    /^get_brand_wcpay_request:fail Fake WeChatPay bridge missing prepay_id package$/,
  );
});

test("fake WeChatPay bridge can cancel a JSAPI payment attempt", async () => {
  const fetchCalls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const bridgeWindow: Pick<Window, "WeixinJSBridge"> = {};

  installFakeWeChatPayBridgeForTesting({
    bridgeWindow,
    bridgeDocument: {
      dispatchEvent() {
        return true;
      },
    },
    fakeWeChatPayOrigin: "https://wechatpay.localhost",
    fetchImpl: async (url, init) => {
      fetchCalls.push({
        url: String(url),
        init,
      });
      return new Response("{}", { status: 200 });
    },
    presentPaymentClient: async () => "CANCEL",
    scheduleTask: (task) => task(),
  });

  const response = await new Promise<WeixinJsBridgeCallbackPayload>((resolve) => {
    bridgeWindow.WeixinJSBridge?.invoke("getBrandWCPayRequest", buildBridgePayload(), resolve);
  });

  assert.equal(response.err_msg, "get_brand_wcpay_request:cancel");
  assert.equal(
    fetchCalls[0]?.url,
    "https://wechatpay.localhost/__fake_wechatpay/prepays/fake_prepay_123/close",
  );
});

test("fake WeChatPay bridge can fail a JSAPI payment attempt", async () => {
  const fetchCalls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const bridgeWindow: Pick<Window, "WeixinJSBridge"> = {};

  installFakeWeChatPayBridgeForTesting({
    bridgeWindow,
    bridgeDocument: {
      dispatchEvent() {
        return true;
      },
    },
    fakeWeChatPayOrigin: "https://wechatpay.localhost",
    fetchImpl: async (url, init) => {
      fetchCalls.push({
        url: String(url),
        init,
      });
      return new Response("{}", { status: 200 });
    },
    presentPaymentClient: async () => "FAIL",
    scheduleTask: (task) => task(),
  });

  const response = await new Promise<WeixinJsBridgeCallbackPayload>((resolve) => {
    bridgeWindow.WeixinJSBridge?.invoke("getBrandWCPayRequest", buildBridgePayload(), resolve);
  });

  assert.equal(response.err_msg, "get_brand_wcpay_request:fail mock payment failed");
  assert.equal(
    fetchCalls[0]?.url,
    "https://wechatpay.localhost/__fake_wechatpay/prepays/fake_prepay_123/fail",
  );
});
