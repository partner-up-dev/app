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
import { bindScenarioWeChatOpenId } from "../pr/_kit/actions/system-state";
import { givenUser } from "../pr/_kit/builders/users";

type PaymentClientActionProjection = {
  type?: string;
  package?: string;
};

type PaymentProviderCatalogProjection = {
  providers: Array<{
    paymentProviderInstanceId: string;
    label: string;
  }>;
};

type PaymentChargeProjection = {
  paymentTx: {
    paymentTxId: string;
    status: string;
    providerStatus: string | null;
    attemptCount: number;
  };
  clientAction: PaymentClientActionProjection;
};

type PaymentTxProjection = {
  status: string;
  providerStatus: string | null;
  attemptCount: number;
  settledAt: string | null;
};

type ProblemDetailsResponse = {
  code?: string;
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

const readPrepayId = (projection: PaymentChargeProjection): string => {
  const clientAction = projection.clientAction;
  assert.equal(clientAction?.type, "WECHAT_BRIDGE");
  assert.equal(projection.paymentTx.status, "ACTION_REQUIRED");
  const packageValue = clientAction?.package ?? "";
  assert.ok(
    packageValue.startsWith("prepay_id="),
    "WeChat bridge action should carry a prepay package",
  );
  return packageValue.slice("prepay_id=".length);
};

scenario(
  "payment_provider_contract_supports_multi_provider_conflict_and_transient_payment_tx_polling",
  async (ctx) => {
    const fakeWeChatPay = await startFakeWeChatPayServer();
    try {
      const payer = await givenUser("provider-ssot-payer");
      await bindScenarioWeChatOpenId({
        user: payer,
        openId: "fake-openid-provider-ssot-payer",
      });
      const providerOne = await registerPaymentProviderInstance({
        providerType: "WECHAT_PAY",
        instanceKey: `provider-ssot-one-${randomUUID()}`,
        displayName: "Provider SSOT Fake WeChatPay One",
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
      const providerTwo = await registerPaymentProviderInstance({
        providerType: "WECHAT_PAY",
        instanceKey: `provider-ssot-two-${randomUUID()}`,
        displayName: "Provider SSOT Fake WeChatPay Two",
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

      const providerCatalog = await expectJsonResponse<PaymentProviderCatalogProjection>(
        await requestJson("/api/payment/providers", {
          method: "GET",
          token: payer.token,
          headers: {
            "x-client-id": "web",
          },
        }),
        200,
      );
      assert.equal(providerCatalog.providers.length, 2);
      assert.deepEqual(
        providerCatalog.providers.map((provider) => provider.paymentProviderInstanceId).sort(),
        [providerOne.providerInstanceId, providerTwo.providerInstanceId].sort(),
      );

      const firstCharge = await expectJsonResponse<PaymentChargeProjection>(
        await requestJson(
          `/api/payment/${providerOne.providerInstanceId}/charge?bill-line=${billLineId}`,
          {
            method: "POST",
            token: payer.token,
            headers: {
              "x-client-id": "web",
            },
          },
        ),
        200,
      );
      const firstPaymentTxId = firstCharge.paymentTx.paymentTxId;
      const firstPrepayId = readPrepayId(firstCharge);
      const firstTransaction = fakeWeChatPay.state
        .snapshot()
        .transactions.find((transaction) => transaction.prepayId === firstPrepayId);
      assert.ok(firstTransaction, "Fake WeChatPay should create first transaction");
      assert.equal(firstTransaction.outTradeNo.length, 32);
      assert.equal(firstTransaction.amount.total, 1200);
      ctx.record("firstOutTradeNo", firstTransaction.outTradeNo);

      const conflict = await expectJsonResponse<ProblemDetailsResponse>(
        await requestJson(
          `/api/payment/${providerTwo.providerInstanceId}/charge?bill-line=${billLineId}`,
          {
            method: "POST",
            token: payer.token,
            headers: {
              "x-client-id": "web",
            },
          },
        ),
        409,
      );
      assert.equal(conflict.code, "PAYMENT_PROVIDER_CONFLICT");

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
      const failedTx = await expectJsonResponse<PaymentTxProjection>(
        await requestJson(`/api/payment/${firstPaymentTxId}`, {
          method: "GET",
          token: payer.token,
        }),
        200,
      );
      assert.equal(failedTx.status, "FAILED");
      assert.equal(failedTx.attemptCount, 1);
      assert.equal(failedTx.settledAt, null);

      const afterFailure = await billLineRepo.findById(billLineId);
      assert.ok(afterFailure, "BillLine should still exist after failed attempt");
      assert.equal(afterFailure.paymentProviderInstanceId, null);
      assert.equal(afterFailure.attemptCount, 1);
      assert.equal(afterFailure.settledAt, null);

      const secondCharge = await expectJsonResponse<PaymentChargeProjection>(
        await requestJson(
          `/api/payment/${providerTwo.providerInstanceId}/charge?bill-line=${billLineId}`,
          {
            method: "POST",
            token: payer.token,
            headers: {
              "x-client-id": "web",
            },
          },
        ),
        200,
      );
      const secondPaymentTxId = secondCharge.paymentTx.paymentTxId;
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
      const settledTx = await expectJsonResponse<PaymentTxProjection>(
        await requestJson(`/api/payment/${secondPaymentTxId}`, {
          method: "GET",
          token: payer.token,
        }),
        200,
      );
      assert.equal(settledTx.status, "SUCCEEDED");
      assert.equal(settledTx.attemptCount, 2);
      assert.ok(settledTx.settledAt, "PaymentTx poll should project settledAt");

      const historicalFailedTx = await expectJsonResponse<PaymentTxProjection>(
        await requestJson(`/api/payment/${firstPaymentTxId}`, {
          method: "GET",
          token: payer.token,
        }),
        200,
      );
      assert.equal(historicalFailedTx.status, "FAILED");
      assert.equal(historicalFailedTx.attemptCount, 1);
      assert.equal(
        historicalFailedTx.settledAt,
        null,
        "Historical failed tx should not inherit later settledAt",
      );

      const settledLine = await billLineRepo.findById(billLineId);
      assert.ok(settledLine, "BillLine should exist after settlement");
      assert.equal(settledLine.paymentProviderInstanceId, providerTwo.providerInstanceId);
      assert.equal(settledLine.attemptCount, 2);
      assert.ok(settledLine.settledAt);

      const txTableRows = await db.execute<{ payment_txs: string | null }>(
        sql`select to_regclass('public.payment_txs')::text as payment_txs`,
      );
      assert.equal(txTableRows[0]?.payment_txs ?? null, null);
    } finally {
      await fakeWeChatPay.close();
    }
  },
);
