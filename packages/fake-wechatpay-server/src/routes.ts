import type { Context } from "hono";
import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  buildRequestSignatureMessage,
  buildSignedHeaders,
  createAesNonce,
  encryptAes256GcmBase64,
  parseAuthorizationHeader,
  verifyRsaSha256,
} from "./crypto";
import type { FakeWeChatPayFixture } from "./fixtures";
import {
  FakeWeChatPayState,
  fakeRefundStateSchema,
  fakeTransactionStateSchema,
  type FakeRefundState,
  type FakeTransactionState,
} from "./state";

const jsapiPrepayRequestSchema = z.object({
  appid: z.string().min(1),
  mchid: z.string().min(1),
  description: z.string().min(1),
  out_trade_no: z.string().min(1),
  notify_url: z.string().url(),
  amount: z.object({
    total: z.number().int().nonnegative(),
    currency: z.literal("CNY").default("CNY"),
  }),
  payer: z.object({
    openid: z.string().min(1),
  }),
  time_expire: z.string().optional(),
});

const h5PrepayRequestSchema = jsapiPrepayRequestSchema.omit({
  payer: true,
});

const refundRequestSchema = z.object({
  transaction_id: z.string().min(1).optional(),
  out_trade_no: z.string().min(1).optional(),
  out_refund_no: z.string().min(1),
  reason: z.string().nullable().optional(),
  notify_url: z.string().url().optional(),
  amount: z.object({
    refund: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    currency: z.literal("CNY").default("CNY"),
  }),
});

const failBodySchema = z.object({
  reason: z.string().min(1).optional(),
});

export type FakeWeChatPayServerAppInput = {
  readonly fixture: FakeWeChatPayFixture;
  readonly state?: FakeWeChatPayState;
  readonly verifyRequests?: boolean;
};

const jsonText = (value: unknown): string => JSON.stringify(value);

const pathWithQuery = (url: string): string => {
  const parsed = new URL(url);
  return `${parsed.pathname}${parsed.search}`;
};

const signedJson = (
  fixture: FakeWeChatPayFixture,
  value: unknown,
  init?: ResponseInit,
): Response => {
  const bodyText = jsonText(value);
  const headers = buildSignedHeaders({
    bodyText,
    platformPrivateKeyPem: fixture.platformCertificate.privateKeyPem,
    platformSerialNo: fixture.platformCertificate.serialNo,
  });
  return new Response(bodyText, {
    ...init,
    headers,
  });
};

const plainJson = (value: unknown, init?: ResponseInit): Response =>
  new Response(jsonText(value), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...Object.fromEntries(new Headers(init?.headers).entries()),
    },
  });

const readJson = async (c: Context): Promise<unknown> => {
  const bodyText = await c.req.text();
  return bodyText.length === 0 ? {} : (JSON.parse(bodyText) as unknown);
};

const readVerifiedJson = async (
  c: Context,
  input: FakeWeChatPayServerAppInput,
): Promise<unknown> => {
  const bodyText = await c.req.text();
  if (input.verifyRequests !== false) {
    const authorization = parseAuthorizationHeader(
      c.req.header("Authorization") ?? null,
    );
    if (authorization.mchid !== input.fixture.mchId) {
      throw new Error("Unexpected mchid in Authorization header");
    }
    if (authorization.serial_no !== input.fixture.merchantCertificate.serialNo) {
      throw new Error("Unexpected merchant serial in Authorization header");
    }
    const verified = verifyRsaSha256({
      message: buildRequestSignatureMessage({
        bodyText,
        method: c.req.method,
        nonce: authorization.nonce_str,
        pathWithQuery: pathWithQuery(c.req.url),
        timestamp: authorization.timestamp,
      }),
      publicKeyPem: input.fixture.merchantCertificate.certificatePem,
      signature: authorization.signature,
    });
    if (!verified) {
      throw new Error("WeChatPay request signature verification failed");
    }
  }

  return bodyText.length === 0 ? {} : (JSON.parse(bodyText) as unknown);
};

const certificatePayload = (fixture: FakeWeChatPayFixture): unknown => {
  const associatedData = "certificate";
  const nonce = createAesNonce();
  return {
    data: [
      {
        effective_time: "2026-01-01T00:00:00+00:00",
        encrypt_certificate: {
          algorithm: "AEAD_AES_256_GCM",
          associated_data: associatedData,
          ciphertext: encryptAes256GcmBase64({
            associatedData,
            key: fixture.apiV3Key,
            nonce,
            plaintext: fixture.platformCertificate.publicKeyPem,
          }),
          nonce,
        },
        expire_time: "2099-12-31T23:59:59+00:00",
        serial_no: fixture.platformCertificate.serialNo,
      },
    ],
  };
};

const transactionResource = (transaction: FakeTransactionState): unknown => ({
  appid: transaction.appid,
  mchid: transaction.mchid,
  out_trade_no: transaction.outTradeNo,
  transaction_id: transaction.transactionId ?? undefined,
  trade_state: transaction.tradeState,
  trade_state_desc:
    transaction.tradeState === "SUCCESS" ? "支付成功" : "交易未支付",
  amount: transaction.amount,
  payer: transaction.payerOpenid ? { openid: transaction.payerOpenid } : undefined,
});

const refundResource = (refund: FakeRefundState): unknown => ({
  out_trade_no: refund.outTradeNo,
  out_refund_no: refund.outRefundNo,
  refund_id: refund.refundId ?? undefined,
  refund_status: refund.status,
  status: refund.status,
  amount: refund.amount,
});

const encryptedNotificationBody = (input: {
  apiV3Key: string;
  eventType: string;
  resource: unknown;
  summary: string;
}): string => {
  const associatedData = "resource";
  const nonce = createAesNonce();
  return jsonText({
    create_time: new Date().toISOString(),
    event_type: input.eventType,
    id: `fake-notify-${randomUUID()}`,
    resource: {
      algorithm: "AEAD_AES_256_GCM",
      associated_data: associatedData,
      ciphertext: encryptAes256GcmBase64({
        associatedData,
        key: input.apiV3Key,
        nonce,
        plaintext: jsonText(input.resource),
      }),
      nonce,
      original_type: "transaction",
    },
    resource_type: "encrypt-resource",
    summary: input.summary,
  });
};

const postSignedNotification = async (input: {
  fixture: FakeWeChatPayFixture;
  notifyUrl: string | null;
  bodyText: string;
}): Promise<void> => {
  if (!input.notifyUrl) return;
  const headers = buildSignedHeaders({
    bodyText: input.bodyText,
    platformPrivateKeyPem: input.fixture.platformCertificate.privateKeyPem,
    platformSerialNo: input.fixture.platformCertificate.serialNo,
  });
  await fetch(input.notifyUrl, {
    body: input.bodyText,
    headers,
    method: "POST",
  });
};

export function createFakeWeChatPayApp(
  input: FakeWeChatPayServerAppInput,
): Hono {
  const state = input.state ?? new FakeWeChatPayState();
  const app = new Hono();

  app.use("/__fake_wechatpay/*", async (c, next) => {
    if (c.req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Access-Control-Allow-Origin": "*",
        },
        status: 204,
      });
    }
    await next();
    c.res.headers.set("Access-Control-Allow-Origin", "*");
    c.res.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    c.res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  });

  app.onError((error) =>
    plainJson(
      {
        code: "FAKE_WECHATPAY_ERROR",
        message: error instanceof Error ? error.message : "Unknown fake error",
      },
      { status: 400 },
    ),
  );

  app.get("/v3/certificates", async (c) => {
    await readVerifiedJson(c, input);
    return signedJson(input.fixture, certificatePayload(input.fixture));
  });

  app.post("/v3/pay/transactions/jsapi", async (c) => {
    const parsed = jsapiPrepayRequestSchema.parse(
      await readVerifiedJson(c, input),
    );
    const transaction = state.createTransaction({
      amount: parsed.amount,
      appid: parsed.appid,
      description: parsed.description,
      h5Url: null,
      mchid: parsed.mchid,
      notifyUrl: parsed.notify_url,
      outTradeNo: parsed.out_trade_no,
      payerOpenid: parsed.payer.openid,
    });
    return signedJson(input.fixture, {
      prepay_id: transaction.prepayId,
    });
  });

  app.post("/v3/pay/transactions/h5", async (c) => {
    const parsed = h5PrepayRequestSchema.parse(
      await readVerifiedJson(c, input),
    );
    const h5Url = `${new URL(c.req.url).origin}/__fake_wechatpay/h5/${encodeURIComponent(
      parsed.out_trade_no,
    )}`;
    state.createTransaction({
      amount: parsed.amount,
      appid: parsed.appid,
      description: parsed.description,
      h5Url,
      mchid: parsed.mchid,
      notifyUrl: parsed.notify_url,
      outTradeNo: parsed.out_trade_no,
      payerOpenid: null,
    });
    return signedJson(input.fixture, {
      h5_url: h5Url,
    });
  });

  app.get("/v3/pay/transactions/out-trade-no/:outTradeNo", async (c) => {
    await readVerifiedJson(c, input);
    const transaction = state.findTransactionByOutTradeNo(
      c.req.param("outTradeNo"),
    );
    if (!transaction) {
      return signedJson(
        input.fixture,
        {
          code: "ORDER_NOT_FOUND",
          message: "Fake transaction not found",
        },
        { status: 404 },
      );
    }
    return signedJson(input.fixture, transactionResource(transaction));
  });

  app.post("/v3/refund/domestic/refunds", async (c) => {
    const parsed = refundRequestSchema.parse(await readVerifiedJson(c, input));
    const outTradeNo =
      parsed.out_trade_no ??
      [...state.snapshot().transactions].find(
        (transaction) => transaction.transactionId === parsed.transaction_id,
      )?.outTradeNo;
    if (!outTradeNo) {
      return signedJson(
        input.fixture,
        {
          code: "ORDER_NOT_FOUND",
          message: "Fake original transaction not found",
        },
        { status: 404 },
      );
    }

    const refund = state.createRefund({
      amount: parsed.amount,
      notifyUrl: parsed.notify_url ?? null,
      outRefundNo: parsed.out_refund_no,
      outTradeNo,
      reason: parsed.reason ?? null,
      transactionId: parsed.transaction_id ?? null,
    });
    await postSignedNotification({
      bodyText: encryptedNotificationBody({
        apiV3Key: input.fixture.apiV3Key,
        eventType: "REFUND.SUCCESS",
        resource: refundResource(refund),
        summary: "退款成功",
      }),
      fixture: input.fixture,
      notifyUrl: refund.notifyUrl,
    });
    return signedJson(input.fixture, refundResource(refund));
  });

  app.get("/v3/refund/domestic/refunds/:outRefundNo", async (c) => {
    await readVerifiedJson(c, input);
    const refund = state.findRefundByOutRefundNo(c.req.param("outRefundNo"));
    if (!refund) {
      return signedJson(
        input.fixture,
        {
          code: "REFUND_NOT_FOUND",
          message: "Fake refund not found",
        },
        { status: 404 },
      );
    }
    return signedJson(input.fixture, refundResource(refund));
  });

  app.post("/__fake_wechatpay/prepays/:prepayId/succeed", async (c) => {
    await readJson(c);
    const transaction = state.findTransactionByPrepayId(c.req.param("prepayId"));
    if (!transaction) {
      return plainJson({ message: "Fake prepay not found" }, { status: 404 });
    }
    const updated = state.markTransaction({
      outTradeNo: transaction.outTradeNo,
      tradeState: "SUCCESS",
    });
    if (!updated) {
      return plainJson({ message: "Fake prepay not found" }, { status: 404 });
    }
    await postSignedNotification({
      bodyText: encryptedNotificationBody({
        apiV3Key: input.fixture.apiV3Key,
        eventType: "TRANSACTION.SUCCESS",
        resource: transactionResource(updated),
        summary: "支付成功",
      }),
      fixture: input.fixture,
      notifyUrl: updated.notifyUrl,
    });
    return plainJson(fakeTransactionStateSchema.parse(updated));
  });

  app.post("/__fake_wechatpay/transactions/:outTradeNo/succeed", async (c) => {
    await readJson(c);
    const updated = state.markTransaction({
      outTradeNo: c.req.param("outTradeNo"),
      tradeState: "SUCCESS",
    });
    if (!updated) {
      return plainJson({ message: "Fake transaction not found" }, { status: 404 });
    }
    await postSignedNotification({
      bodyText: encryptedNotificationBody({
        apiV3Key: input.fixture.apiV3Key,
        eventType: "TRANSACTION.SUCCESS",
        resource: transactionResource(updated),
        summary: "支付成功",
      }),
      fixture: input.fixture,
      notifyUrl: updated.notifyUrl,
    });
    return plainJson(fakeTransactionStateSchema.parse(updated));
  });

  app.post("/__fake_wechatpay/transactions/:outTradeNo/fail", async (c) => {
    failBodySchema.parse(await readJson(c));
    const updated = state.markTransaction({
      outTradeNo: c.req.param("outTradeNo"),
      tradeState: "PAYERROR",
    });
    return updated
      ? plainJson(fakeTransactionStateSchema.parse(updated))
      : plainJson({ message: "Fake transaction not found" }, { status: 404 });
  });

  app.post("/__fake_wechatpay/refunds/:outRefundNo/succeed", async (c) => {
    await readJson(c);
    const updated = state.markRefund({
      outRefundNo: c.req.param("outRefundNo"),
      status: "SUCCESS",
    });
    return updated
      ? plainJson(fakeRefundStateSchema.parse(updated))
      : plainJson({ message: "Fake refund not found" }, { status: 404 });
  });

  app.post("/__fake_wechatpay/refunds/:outRefundNo/fail", async (c) => {
    failBodySchema.parse(await readJson(c));
    const updated = state.markRefund({
      outRefundNo: c.req.param("outRefundNo"),
      status: "ABNORMAL",
    });
    return updated
      ? plainJson(fakeRefundStateSchema.parse(updated))
      : plainJson({ message: "Fake refund not found" }, { status: 404 });
  });

  app.get("/__fake_wechatpay/state", () => plainJson(state.snapshot()));
  app.post("/__fake_wechatpay/reset", async (c) => {
    await readJson(c);
    state.reset();
    return plainJson({ ok: true });
  });

  return app;
}
