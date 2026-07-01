import { afterEach, describe, expect, test } from "vitest";
import { type StartedFakeWeChatPayServer, startFakeWeChatPayServer } from "./server";

describe("startFakeWeChatPayServer", () => {
  let server: StartedFakeWeChatPayServer | null = null;

  afterEach(async () => {
    await server?.close();
    server = null;
  });

  test("serves health readiness", async () => {
    server = await startFakeWeChatPayServer();

    const response = await fetch(`${server.origin}/health`, {
      method: "HEAD",
    });

    expect(response.ok).toBe(true);
  });

  test("supports prepay keyed success, close, and fail transitions", async () => {
    server = await startFakeWeChatPayServer({
      verifyRequests: false,
    });

    const transaction = server.state.createTransaction({
      amount: {
        total: 4_000,
        currency: "CNY",
      },
      appid: "wx-dev-app",
      description: "Ride hailing payment",
      h5Url: null,
      mchid: "mch-dev-001",
      notifyUrl: `${server.origin}/health`,
      outTradeNo: "merchant-order-001",
      payerOpenid: "openid-dev-001",
    });

    const succeedResponse = await fetch(
      `${server.origin}/__fake_wechatpay/prepays/${encodeURIComponent(transaction.prepayId)}/succeed`,
      {
        method: "POST",
      },
    );
    expect(succeedResponse.ok).toBe(true);
    expect(server.state.findTransactionByOutTradeNo(transaction.outTradeNo)?.tradeState).toBe(
      "SUCCESS",
    );

    const secondTransaction = server.state.createTransaction({
      amount: {
        total: 4_000,
        currency: "CNY",
      },
      appid: "wx-dev-app",
      description: "Ride hailing payment",
      h5Url: null,
      mchid: "mch-dev-001",
      notifyUrl: `${server.origin}/health`,
      outTradeNo: "merchant-order-002",
      payerOpenid: "openid-dev-002",
    });

    const closeResponse = await fetch(
      `${server.origin}/__fake_wechatpay/prepays/${encodeURIComponent(secondTransaction.prepayId)}/close`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          reason: "client cancel",
        }),
      },
    );
    expect(closeResponse.ok).toBe(true);
    expect(server.state.findTransactionByOutTradeNo(secondTransaction.outTradeNo)?.tradeState).toBe(
      "CLOSED",
    );

    const thirdTransaction = server.state.createTransaction({
      amount: {
        total: 4_000,
        currency: "CNY",
      },
      appid: "wx-dev-app",
      description: "Ride hailing payment",
      h5Url: null,
      mchid: "mch-dev-001",
      notifyUrl: `${server.origin}/health`,
      outTradeNo: "merchant-order-003",
      payerOpenid: "openid-dev-003",
    });

    const failResponse = await fetch(
      `${server.origin}/__fake_wechatpay/prepays/${encodeURIComponent(thirdTransaction.prepayId)}/fail`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          reason: "client fail",
        }),
      },
    );
    expect(failResponse.ok).toBe(true);
    expect(server.state.findTransactionByOutTradeNo(thirdTransaction.outTradeNo)?.tradeState).toBe(
      "PAYERROR",
    );
  });
});
