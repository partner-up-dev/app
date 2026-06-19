import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { startFakeWeChatPayServer } from "@partner-up-dev/fake-wechatpay-server";
import { sql } from "drizzle-orm";
import { createOffer, createProductSku, createProductSpu } from "../../src/domains/merchandising";
import { registerPaymentProviderInstance } from "../../src/domains/payment/use-cases/register-payment-provider-instance";
import { buildOrderParticipantsFromContext, createRentalOrder } from "../../src/domains/trade";
import type { BillId } from "../../src/entities/bill";
import { db } from "../../src/lib/db";
import { BillLineRepository } from "../../src/repositories/BillLineRepository";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { scenario } from "../_infra/scenario/scenario";
import { bindScenarioWeChatOpenId } from "../pr-core/_kit/actions/system-state";
import { givenUser } from "../pr-core/_kit/builders/users";

type PaymentClientActionProjection = {
  type?: string;
  package?: string;
};

type PaymentCheckoutProjection = {
  payment: {
    status: string;
    providerStatus: string | null;
    clientAction: PaymentClientActionProjection | null;
    attemptCount: number;
  } | null;
};

type PaymentExecutionProjection = {
  status: string;
  providerStatus: string | null;
  attemptCount: number;
  settledAt: string | null;
};

const billLineRepo = new BillLineRepository();

async function givenRentalBillLineForPayment(input: { userId: string }): Promise<string> {
  const spu = await createProductSpu({
    name: "Provider SSOT rental room",
    productType: "RENTAL",
    status: "ACTIVE",
    salesPolicy: {
      skuSelectionPolicy: {
        type: "EXACTLY_ONE",
      },
      quantityPolicy: {
        type: "FIXED",
        quantity: 1,
      },
    },
    servicePolicy: {
      type: "RENTAL",
      bookingLeadTimeMinutes: 0,
      requiresContactPhone: true,
      requiresRealName: true,
      requiresNationalId: false,
    },
    presentation: {
      heroImageAssetIds: [],
      detailImageAssetIds: [],
      sellingPoints: [],
      parameterGroups: [],
      noticeBlocks: [],
    },
  });
  const sku = await createProductSku({
    spuId: spu.id,
    name: "Provider SSOT rental sku",
    status: "ACTIVE",
    facts: {
      type: "RENTAL",
      zoneCode: "PROVIDER_SSOT_ZONE",
      participantCount: 1,
      durationMinutes: 60,
    },
    pricingModel: {
      type: "FIXED_TOTAL",
      amountFen: 1200,
    },
  });
  const offer = await createOffer({
    productType: "RENTAL",
    spuIds: [spu.id],
    status: "ACTIVE",
    pricingRules: [],
    termsVersion: 1,
  });
  const itemId = randomUUID();
  const order = await createRentalOrder({
    createdBy: input.userId,
    participants: buildOrderParticipantsFromContext({
      participants: [
        {
          participantId: `participant-${input.userId}`,
          userId: input.userId,
          joinedVia: "API",
        },
      ],
      createdBy: input.userId,
    }),
    offerId: offer.id,
    items: [
      {
        itemId,
        sku: {
          id: sku.id,
          version: sku.version,
          name: sku.name,
          factsSnapshot: sku.facts,
          pricingModelSnapshot: sku.pricingModel,
          cancellationPolicySnapshot: null,
        },
        quantity: 1,
      },
    ],
    pricingSnapshot: {
      currency: "CNY",
      itemBreakdowns: [
        {
          itemId,
          resolvedAmountFen: 1200,
          explanations: [],
        },
      ],
      orderLevelExplanations: [],
      subtotalFen: 1200,
      totalFen: 1200,
    },
    serviceStartAt: "2031-03-01T10:00:00.000Z",
    serviceEndAt: "2031-03-01T11:00:00.000Z",
    contactPhone: "13800138088",
    registrants: [
      {
        name: "支付测试",
        phone: "13800138088",
        nationalIdMasked: null,
      },
    ],
  });

  const lines = await billLineRepo.listByBillId(order.billId as BillId);
  const chargeLine = lines.find((line) => line.kind === "CHARGE");
  assert.ok(chargeLine, "Rental order should create a charge BillLine");
  return chargeLine.id;
}

const readPrepayId = (projection: PaymentCheckoutProjection): string => {
  const clientAction = projection.payment?.clientAction;
  assert.equal(clientAction?.type, "WECHAT_BRIDGE");
  assert.equal(projection.payment?.status, "ACTION_REQUIRED");
  const packageValue = clientAction?.package ?? "";
  assert.ok(
    packageValue.startsWith("prepay_id="),
    "WeChat bridge action should carry a prepay package",
  );
  return packageValue.slice("prepay_id=".length);
};

scenario("payment_provider_ssot_charge_retry_and_settlement_uses_provider_query", async (ctx) => {
  const fakeWeChatPay = await startFakeWeChatPayServer();
  try {
    const payer = await givenUser("provider-ssot-payer");
    await bindScenarioWeChatOpenId({
      user: payer,
      openId: "fake-openid-provider-ssot-payer",
    });
    await registerPaymentProviderInstance({
      providerType: "WECHAT_PAY",
      instanceKey: `provider-ssot-${randomUUID()}`,
      displayName: "Provider SSOT Fake WeChatPay",
      clientId: "web",
      config: {
        adapterMode: "WECHAT_PAY_API_V3",
        appId: fakeWeChatPay.fixture.appId,
        mchId: fakeWeChatPay.fixture.mchId,
        chargeMode: "JSAPI",
        endpointBaseUrl: fakeWeChatPay.origin,
        apiV3Key: fakeWeChatPay.fixture.apiV3Key,
        merchantCertificate: fakeWeChatPay.fixture.merchantCertificate,
        platformCertificates: null,
      },
    });
    const billLineId = await givenRentalBillLineForPayment({
      userId: payer.user.id,
    });

    const firstCharge = await expectJsonResponse<PaymentCheckoutProjection>(
      await requestJson(`/api/commerce/bill-lines/${billLineId}/charges`, {
        method: "POST",
        token: payer.token,
        headers: {
          "x-client-id": "web",
        },
      }),
      200,
    );
    const firstPrepayId = readPrepayId(firstCharge);
    const firstTransaction = fakeWeChatPay.state
      .snapshot()
      .transactions.find((transaction) => transaction.prepayId === firstPrepayId);
    assert.ok(firstTransaction, "Fake WeChatPay should create first transaction");
    assert.equal(firstTransaction.outTradeNo.length, 32);
    assert.equal(firstTransaction.amount.total, 1200);
    ctx.record("firstOutTradeNo", firstTransaction.outTradeNo);

    await fetch(
      `${fakeWeChatPay.origin}/__fake_wechatpay/transactions/${firstTransaction.outTradeNo}/fail`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ reason: "scenario retry" }),
      },
    );
    const failedSync = await expectJsonResponse<PaymentExecutionProjection>(
      await requestJson(`/api/commerce/bill-lines/${billLineId}/payment/sync`, {
        method: "POST",
        token: payer.token,
      }),
      200,
    );
    assert.equal(failedSync.status, "FAILED");
    assert.equal(failedSync.attemptCount, 1);

    const afterFailure = await billLineRepo.findById(billLineId);
    assert.ok(afterFailure, "BillLine should still exist after failed attempt");
    assert.equal(afterFailure.paymentProviderInstanceId, null);
    assert.equal(afterFailure.attemptCount, 1);
    assert.equal(afterFailure.settledAt, null);

    const secondCharge = await expectJsonResponse<PaymentCheckoutProjection>(
      await requestJson(`/api/commerce/bill-lines/${billLineId}/charges`, {
        method: "POST",
        token: payer.token,
        headers: {
          "x-client-id": "web",
        },
      }),
      200,
    );
    const secondPrepayId = readPrepayId(secondCharge);
    const secondTransaction = fakeWeChatPay.state
      .snapshot()
      .transactions.find((transaction) => transaction.prepayId === secondPrepayId);
    assert.ok(secondTransaction, "Fake WeChatPay should create second transaction");
    assert.notEqual(secondTransaction.outTradeNo, firstTransaction.outTradeNo);
    assert.equal(secondTransaction.outTradeNo.length, 32);
    ctx.record("secondOutTradeNo", secondTransaction.outTradeNo);

    fakeWeChatPay.state.markTransaction({
      outTradeNo: secondTransaction.outTradeNo,
      tradeState: "SUCCESS",
    });
    const settledSync = await expectJsonResponse<PaymentExecutionProjection>(
      await requestJson(`/api/commerce/bill-lines/${billLineId}/payment/sync`, {
        method: "POST",
        token: payer.token,
      }),
      200,
    );
    assert.equal(settledSync.status, "SUCCEEDED");
    assert.equal(settledSync.attemptCount, 2);
    assert.ok(settledSync.settledAt, "Sync should project settledAt");

    const settledLine = await billLineRepo.findById(billLineId);
    assert.ok(settledLine, "BillLine should exist after settlement");
    assert.ok(settledLine.paymentProviderInstanceId);
    assert.equal(settledLine.attemptCount, 2);
    assert.ok(settledLine.settledAt);

    const txTableRows = await db.execute<{ payment_txs: string | null }>(
      sql`select to_regclass('public.payment_txs')::text as payment_txs`,
    );
    assert.equal(txTableRows[0]?.payment_txs ?? null, null);
  } finally {
    await fakeWeChatPay.close();
  }
});
