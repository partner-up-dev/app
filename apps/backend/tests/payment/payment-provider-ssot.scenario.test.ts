import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { startFakeWeChatPayServer } from "@partner-up-dev/fake-wechatpay-server";
import { sql } from "drizzle-orm";
import { createBillFromSeed } from "../../src/domains/bill/commands";
import { settleBillLinePaymentExecution } from "../../src/domains/bill/commands";
import { createOffer, createProductSpu } from "../../src/domains/merchandising/commands";
import { registerPaymentProviderInstance } from "../../src/domains/payment/commands";
import type { BillId } from "../../src/entities/bill";
import type { OfferId } from "../../src/entities/offer";
import { db } from "../../src/lib/db";
import { BillLineRepository } from "../../src/repositories/BillLineRepository";
import { RideHailingOrderRepository } from "../../src/repositories/RideHailingOrderRepository";
import { RideHailingProviderInstanceRepository } from "../../src/repositories/RideHailingProviderInstanceRepository";
import { TradeOrderRepository } from "../../src/repositories/TradeOrderRepository";
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
const rideHailingOrderRepo = new RideHailingOrderRepository();
const rideHailingProviderRepo = new RideHailingProviderInstanceRepository();
const tradeOrderRepo = new TradeOrderRepository();

async function givenBillLineForPayment(input: { userId: string }): Promise<string> {
  const rideHailingProvider = await rideHailingProviderRepo.create({
    providerType: "CAOCAO",
    instanceKey: `payment-provider-ssot-ride-${randomUUID()}`,
    status: "ACTIVE",
    displayName: "Payment Provider SSoT Ride Provider",
    config: {
      adapterMode: "CAOCAO_OPEN_API",
      caocaoClientId: "payment-provider-ssot-ride-client",
      signKey: "payment-provider-ssot-ride-secret",
      endpointBaseUrl: "https://provider.invalid/v2",
      callbackBaseUrl: "https://api.partner-up.test",
    },
  });
  const spu = await createProductSpu({
    name: "Provider SSOT payment fixture",
    productType: "RIDE_HAILING",
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
      type: "RIDE_HAILING",
    },
    presentation: {
      heroImageAssetIds: [],
      detailImageAssetIds: [],
      sellingPoints: [],
      parameterGroups: [],
      noticeBlocks: [],
    },
  });
  const offer = await createOffer({
    productType: "RIDE_HAILING",
    spuIds: [spu.id],
    status: "ACTIVE",
    pricingRules: [],
    termsVersion: 1,
  });
  const order = await tradeOrderRepo.create({
    family: "RIDE_HAILING",
    offerId: offer.id as OfferId,
    createdBy: input.userId,
    status: "OPEN",
    participants: [
      {
        participantId: `participant-${input.userId}`,
        userId: input.userId,
        role: "CREATOR",
        joinedVia: "API",
      },
    ],
    splitRuleSnapshot: {
      type: "RELATIVE",
      shares: [{ userId: input.userId, percentBps: 10000 }],
    },
    pricingExecutionSnapshot: null,
    items: [],
    timeout: {
      unpaidExpiresAt: "2099-03-01T10:00:00.000Z",
      defaultWindowMinutes: 30,
    },
  });
  await rideHailingOrderRepo.create({
    orderId: order.id,
    routeSnapshot: {
      origin: { name: "支付起点", latitude: 30.2, longitude: 120.1 },
      waypoints: [],
      destination: { name: "支付终点", latitude: 30.3, longitude: 120.2 },
    },
    riders: [],
    contactPhone: "13800138088",
    dispatchBinding: {
      providerInstanceId: rideHailingProvider.id,
      providerType: "CAOCAO",
      providerOrderId: "CC-PAYMENT-PROVIDER-SSOT",
      externalOrderId: null,
      submittedAt: "2099-03-01T09:00:00.000Z",
      submissionMode: "SINGLE_CANDIDATE",
      submittedCandidates: [],
      providerSnapshot: null,
    },
    executionPhase: "FINISHED",
    finalSettlementInput: {
      amountFen: 1200,
      currency: "CNY",
      providerOrderId: "CC-PAYMENT-PROVIDER-SSOT",
      committedAt: "2099-03-01T09:30:00.000Z",
    },
  });
  const bill = await createBillFromSeed({
    sourceOrderId: order.id,
    currency: "CNY",
    chargeLines: [
      {
        userId: input.userId,
        amountFen: 1200,
        label: "Provider SSOT charge",
        description: "Payment-owned test fixture",
      },
    ],
  });

  const lines = await billLineRepo.listByBillId(bill.billId as BillId);
  const chargeLine = lines.find((line) => line.kind === "CHARGE");
  assert.ok(chargeLine, "Payment fixture should contain a charge BillLine");
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
      const billLineId = await givenBillLineForPayment({
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
        outTradeNo: firstTransaction.outTradeNo,
        tradeState: "SUCCESS",
      });
      const staleSettlement = await settleBillLinePaymentExecution({
        billLineId,
        paymentProviderInstanceId: providerOne.providerInstanceId,
        attemptCount: 1,
        settledAt: new Date(),
      });
      assert.equal(staleSettlement.status, "STALE");

      const supersededPaymentTx = await expectJsonResponse<ProblemDetailsResponse>(
        await requestJson(`/api/payment/${firstPaymentTxId}`, {
          method: "GET",
          token: payer.token,
        }),
        409,
      );
      assert.equal(supersededPaymentTx.code, "PAYMENT_ATTEMPT_SUPERSEDED");

      const afterStaleSuccess = await billLineRepo.findById(billLineId);
      assert.ok(afterStaleSuccess, "BillLine should exist after a stale provider success");
      assert.equal(afterStaleSuccess.paymentProviderInstanceId, providerOne.providerInstanceId);
      assert.equal(afterStaleSuccess.attemptCount, 2);
      assert.equal(afterStaleSuccess.settledAt, null);

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

      const historicalSupersededTx = await expectJsonResponse<ProblemDetailsResponse>(
        await requestJson(`/api/payment/${firstPaymentTxId}`, {
          method: "GET",
          token: payer.token,
        }),
        409,
      );
      assert.equal(historicalSupersededTx.code, "PAYMENT_ATTEMPT_SUPERSEDED");

      const settledLine = await billLineRepo.findById(billLineId);
      assert.ok(settledLine, "BillLine should exist after settlement");
      assert.equal(settledLine.paymentProviderInstanceId, providerOne.providerInstanceId);
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
