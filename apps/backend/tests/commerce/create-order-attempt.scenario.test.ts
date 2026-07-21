import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  createOffer,
  createProductSku,
  createProductSpu,
} from "../../src/domains/merchandising/commands";
import {
  createEmptyProductPresentation,
  type PricingModel,
} from "../../src/domains/merchandising/model";
import { confirmRideCreateAttemptFromProvider } from "../../src/domains/trade/commands";
import { createOrderCommand } from "../../src/domains/trade/use-cases/create-order";
import { PR_ACTIVE_ORDER_EXISTS_CODE } from "../../src/domains/pr/contracts";
import type { OfferListingSessionId, OfferQuoteId } from "../../src/entities/commerce-quote";
import {
  createOrderAttempts,
  type CreateOrderAttemptId,
} from "../../src/entities/create-order-attempt";
import type { OfferId } from "../../src/entities/offer";
import type { PRId } from "../../src/entities/partner-request";
import type { RideHailingProviderInstanceId } from "../../src/entities/ride-hailing-provider";
import { tradeOrders, type TradeOrderId } from "../../src/entities/trade-order";
import { db } from "../../src/lib/db";
import { ProblemDetailsError } from "../../src/lib/problem-details";
import { CommerceQuoteRepository } from "../../src/repositories/CommerceQuoteRepository";
import { CreateOrderAttemptRepository } from "../../src/repositories/CreateOrderAttemptRepository";
import { PartnerRepository } from "../../src/repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../src/repositories/PartnerRequestRepository";
import { RideHailingOrderRepository } from "../../src/repositories/RideHailingOrderRepository";
import { RideHailingProviderInstanceRepository } from "../../src/repositories/RideHailingProviderInstanceRepository";
import { TradeOrderRepository } from "../../src/repositories/TradeOrderRepository";
import { startFakeCaocaoServer } from "../../../../packages/fake-caocao-server/src/server";
import { scenario } from "../_infra/scenario/scenario";
import { givenUser } from "../pr/_kit/builders/users";

const providerEstimatePricingModel: PricingModel = {
  type: "DYNAMIC_QUOTE",
  calculatorSpec: {
    components: [
      {
        amount: { path: "provider.estimateAmountFen", type: "INPUT" },
        id: "caocao-provider-estimate",
        label: "曹操预估价",
      },
    ],
    currency: "CNY",
    version: 1,
  },
};

async function givenCreateOrderFixture(input: {
  endpointBaseUrl: string;
  caocaoClientId: string;
  signKey: string;
  suffix: string;
}) {
  const creator = await givenUser(`create-attempt-${input.suffix}-${randomUUID()}`);
  const provider = await new RideHailingProviderInstanceRepository().create({
    providerType: "CAOCAO",
    instanceKey: `attempt-${input.suffix}-${randomUUID()}`,
    status: "ACTIVE",
    displayName: "Attempt CaoCao",
    config: {
      adapterMode: "CAOCAO_OPEN_API",
      caocaoClientId: input.caocaoClientId,
      signKey: input.signKey,
      endpointBaseUrl: input.endpointBaseUrl,
      callbackBaseUrl: null,
    },
  });
  const spu = await createProductSpu({
    name: `Attempt ride ${input.suffix} ${randomUUID()}`,
    productType: "RIDE_HAILING",
    presentation: createEmptyProductPresentation(),
    salesPolicy: {
      quantityPolicy: { quantity: 1, type: "FIXED" },
      skuSelectionPolicy: { max: null, min: 1, resolvesTo: 1, type: "CHOICE_SET" },
    },
    servicePolicy: { type: "RIDE_HAILING" },
    status: "ACTIVE",
  });
  const sku = await createProductSku({
    facts: {
      providerVehicleTypeCode: "3",
      rideHailingProviderInstanceId: provider.id,
    },
    name: "快车",
    pricingModel: providerEstimatePricingModel,
    sortOrder: 10,
    spuId: spu.id,
    status: "ACTIVE",
  });
  const offer = await createOffer({
    pricingRules: [],
    productType: "RIDE_HAILING",
    spuIds: [spu.id],
    status: "ACTIVE",
    termsVersion: 1,
  });
  const pr = await new PartnerRequestRepository().create({
    createdBy: creator.user.id,
    joinGateConfig: [],
    preferences: [],
    status: "READY",
    time: ["2031-01-01T00:00:00.000Z", "2031-01-01T01:00:00.000Z"],
    title: `Attempt ${input.suffix}`,
    type: "ride-hailing",
  });
  assert.ok(pr);
  await new PartnerRepository().createSlot({
    prId: pr.id,
    status: "JOINED",
    userId: creator.user.id,
  });
  const quote = await new CommerceQuoteRepository().create({
    id: randomUUID() as OfferQuoteId,
    listingSessionId: randomUUID() as OfferListingSessionId,
    offerId: offer.id,
    productType: "RIDE_HAILING",
    itemKind: "CHOICE_CANDIDATE",
    spuId: spu.id,
    skuId: sku.id,
    quantity: 1,
    listingContextSnapshot: {
      productType: "RIDE_HAILING",
      participants: [
        {
          participantId: randomUUID(),
          userId: creator.user.id,
          role: "CREATOR",
          joinedVia: "PR_ACTIVE_PARTICIPANT",
          joinedAt: new Date().toISOString(),
          removedAt: null,
        },
      ],
      route: {
        origin: {
          address: "杭州市上城区全福桥路2号",
          latitude: 30.2912,
          longitude: 120.212,
          name: "杭州东站",
        },
        waypoints: [],
        destination: {
          address: "杭州市西湖区灵隐路1号",
          latitude: 30.24,
          longitude: 120.102,
          name: "灵隐寺",
        },
      },
      departureAt: null,
      riders: [
        {
          displayName: "下单发起人",
          phoneMasked: null,
          userId: creator.user.id,
        },
      ],
      contactPhone: "13800138000",
    },
    fulfillmentQuoteSnapshot: {
      productType: "RIDE_HAILING",
      providerInstanceId: provider.id,
      providerName: "Attempt CaoCao",
      providerVehicleTypeCode: "3",
      providerVehicleTypeName: "快车",
      providerQuoteId: "fake_quote_3_3600",
      providerQuoteExpiresAt: null,
      providerSnapshot: {},
      estimateAmountFen: 3600,
      distanceMeters: 8200,
      durationSeconds: 1500,
      displayName: "Attempt CaoCao 快车",
    },
    pricingSnapshot: {
      currency: "CNY",
      explanations: [],
      totalFen: 3600,
    },
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  return {
    command: {
      createdBy: creator.user.id,
      prId: pr.id,
      items: [{ kind: "CHOICE_SET" as const, candidateQuoteIds: [quote.id] }],
    },
    offer,
    pr,
    provider,
  };
}

async function expectProblemCode(
  run: () => Promise<unknown>,
  expectedCode: string,
): Promise<ProblemDetailsError> {
  let thrown: unknown = null;
  try {
    await run();
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof ProblemDetailsError);
  assert.equal(thrown.code, expectedCode);
  return thrown;
}

scenario(
  "commerce_create_order_attempt_replays_unknown_outcome_without_second_provider_create",
  async (ctx) => {
    const server = await startFakeCaocaoServer({ callbackBaseUrl: null });
    try {
      const fixture = await givenCreateOrderFixture({
        endpointBaseUrl: server.origin,
        caocaoClientId: server.fixture.clientId,
        signKey: server.fixture.signKey,
        suffix: "response-loss",
      });
      const idempotencyKey = randomUUID();
      const armed = await fetch(`${server.origin}/__fake_caocao/create-response-loss/next`, {
        method: "POST",
      });
      assert.equal(armed.ok, true);

      const first = await createOrderCommand({ ...fixture.command, idempotencyKey });
      assert.equal(first.outcome, "PROCESSING");
      assert.equal(server.state.snapshot().createRequestCount, 1);
      assert.equal(server.state.snapshot().orders.length, 1);

      const replay = await createOrderCommand({ ...fixture.command, idempotencyKey });
      assert.deepEqual(replay, first);
      assert.equal(server.state.snapshot().createRequestCount, 1);

      const mismatch = await expectProblemCode(
        () =>
          createOrderCommand({
            ...fixture.command,
            prId: fixture.pr.id + 1,
            idempotencyKey,
          }),
        "IDEMPOTENCY_KEY_REUSED",
      );
      assert.equal(mismatch.status, 409);
      assert.equal(server.state.snapshot().createRequestCount, 1);

      const attempt = await new CreateOrderAttemptRepository().findByActorAndKey({
        actorUserId: fixture.command.createdBy,
        idempotencyKey,
      });
      assert.equal(attempt?.status, "SUBMITTING");
      assert.ok(attempt);
      const acceptedProviderOrder = server.state.snapshot().orders[0];
      assert.ok(acceptedProviderOrder);
      assert.deepEqual(
        await confirmRideCreateAttemptFromProvider({
          orderId: attempt.orderId,
          providerInstanceId: fixture.provider.id,
          externalOrderId: acceptedProviderOrder.externalOrderId,
          providerOrderId: acceptedProviderOrder.providerOrderId,
          providerSnapshot: { source: "response-loss-recovery" },
        }),
        { recovered: true },
      );
      const recoveredReplay = await createOrderCommand({ ...fixture.command, idempotencyKey });
      assert.equal(recoveredReplay.outcome, "CREATED");
      assert.equal(recoveredReplay.orderId, first.orderId);
      assert.equal(server.state.snapshot().createRequestCount, 1);
      ctx.record("attemptId", attempt?.id ?? null);
      ctx.record("orderId", first.orderId);
      ctx.record("providerCreateCount", server.state.snapshot().createRequestCount);
    } finally {
      await server.close();
    }
  },
);

scenario("commerce_create_order_pr_lock_allows_one_provider_create_under_race", async (ctx) => {
  const server = await startFakeCaocaoServer({ callbackBaseUrl: null });
  try {
    const fixture = await givenCreateOrderFixture({
      endpointBaseUrl: server.origin,
      caocaoClientId: server.fixture.clientId,
      signKey: server.fixture.signKey,
      suffix: "pr-race",
    });
    const results = await Promise.allSettled([
      createOrderCommand({ ...fixture.command, idempotencyKey: randomUUID() }),
      createOrderCommand({ ...fixture.command, idempotencyKey: randomUUID() }),
    ]);
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.equal(fulfilled[0]?.value.outcome, "CREATED");
    assert.ok(rejected[0]?.reason instanceof ProblemDetailsError);
    assert.equal(rejected[0]?.reason.status, 409);
    assert.equal(rejected[0]?.reason.code, PR_ACTIVE_ORDER_EXISTS_CODE);
    assert.equal(server.state.snapshot().createRequestCount, 1);
    assert.equal(server.state.snapshot().orders.length, 1);

    const persistedPr = await new PartnerRequestRepository().findById(fixture.pr.id);
    assert.equal(persistedPr?.orders.length, 1);
    const persistedOrders = await db
      .select({ id: tradeOrders.id })
      .from(tradeOrders)
      .where(eq(tradeOrders.offerId, fixture.offer.id));
    const persistedAttempts = await db
      .select({ id: createOrderAttempts.id })
      .from(createOrderAttempts)
      .where(eq(createOrderAttempts.offerId, fixture.offer.id));
    assert.equal(persistedOrders.length, 1);
    assert.equal(persistedAttempts.length, 1);
    ctx.record("winnerOrderId", persistedPr?.orders[0] ?? null);
    ctx.record("providerCreateCount", server.state.snapshot().createRequestCount);
  } finally {
    await server.close();
  }
});

scenario("commerce_create_order_same_key_race_replays_one_provider_create", async (ctx) => {
  const server = await startFakeCaocaoServer({ callbackBaseUrl: null });
  try {
    const fixture = await givenCreateOrderFixture({
      endpointBaseUrl: server.origin,
      caocaoClientId: server.fixture.clientId,
      signKey: server.fixture.signKey,
      suffix: "same-key-race",
    });
    const idempotencyKey = randomUUID();
    const results = await Promise.allSettled([
      createOrderCommand({ ...fixture.command, idempotencyKey }),
      createOrderCommand({ ...fixture.command, idempotencyKey }),
    ]);
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    assert.equal(rejected.length, 0);
    assert.equal(fulfilled.length, 2);
    const first = fulfilled[0]?.value;
    const second = fulfilled[1]?.value;
    assert.ok(first);
    assert.ok(second);
    assert.equal(second.orderId, first.orderId);
    assert.ok(first.outcome === "CREATED" || first.outcome === "PROCESSING");
    assert.ok(second.outcome === "CREATED" || second.outcome === "PROCESSING");
    assert.equal(server.state.snapshot().createRequestCount, 1);
    assert.equal(server.state.snapshot().orders.length, 1);
    const replay = await createOrderCommand({ ...fixture.command, idempotencyKey });
    assert.equal(replay.outcome, "CREATED");
    assert.equal(replay.orderId, first.orderId);
    ctx.record("orderId", first.orderId);
    ctx.record("providerCreateCount", server.state.snapshot().createRequestCount);
  } finally {
    await server.close();
  }
});

scenario(
  "commerce_create_order_attempt_recovers_binding_from_provider_confirmation",
  async (ctx) => {
    const creator = await givenUser(`create-attempt-${randomUUID()}`);
    const spu = await createProductSpu({
      name: `Attempt ride ${randomUUID()}`,
      productType: "RIDE_HAILING",
      presentation: createEmptyProductPresentation(),
      salesPolicy: {
        quantityPolicy: { quantity: 1, type: "FIXED" },
        skuSelectionPolicy: { max: null, min: 1, resolvesTo: 1, type: "CHOICE_SET" },
      },
      servicePolicy: { type: "RIDE_HAILING" },
      status: "ACTIVE",
    });
    const offer = await createOffer({
      pricingRules: [],
      productType: "RIDE_HAILING",
      spuIds: [spu.id],
      status: "ACTIVE",
      termsVersion: 1,
    });
    const pr = await new PartnerRequestRepository().create({
      createdBy: creator.user.id,
      joinGateConfig: [],
      preferences: [],
      status: "READY",
      time: ["2031-01-01T00:00:00.000Z", "2031-01-01T01:00:00.000Z"],
      title: "Attempt callback recovery",
      type: "ride-hailing",
    });
    assert.ok(pr);
    await new PartnerRepository().createSlot({
      prId: pr.id,
      status: "JOINED",
      userId: creator.user.id,
    });
    const provider = await new RideHailingProviderInstanceRepository().create({
      providerType: "CAOCAO",
      instanceKey: `attempt-${randomUUID()}`,
      status: "ACTIVE",
      displayName: "Attempt CaoCao",
      config: {
        adapterMode: "CAOCAO_OPEN_API",
        caocaoClientId: "attempt-client",
        signKey: "attempt-sign-key",
        endpointBaseUrl: "https://caocao.invalid",
        callbackBaseUrl: "https://partner-up.invalid",
      },
    });
    const order = await new TradeOrderRepository().create({
      family: "RIDE_HAILING",
      offerId: offer.id as OfferId,
      createdBy: creator.user.id,
      status: "INITIATING",
      participants: [],
      splitRuleSnapshot: { type: "RELATIVE", shares: [] },
      items: [],
      timeout: { defaultWindowMinutes: 0, unpaidExpiresAt: "9999-12-31T23:59:59.999Z" },
    });
    await new RideHailingOrderRepository().create({
      orderId: order.id,
      routeSnapshot: {
        origin: { name: "起点", latitude: 30.2, longitude: 120.1 },
        waypoints: [],
        destination: { name: "终点", latitude: 30.3, longitude: 120.2 },
      },
      riders: [],
      contactPhone: "13800138000",
      executionPhase: "INITIATING",
    });
    const externalOrderId = `rh-${randomUUID()}`;
    const attempt = await new CreateOrderAttemptRepository().create({
      actorUserId: creator.user.id,
      idempotencyKey: randomUUID(),
      commandFingerprint: "a".repeat(64),
      prId: pr.id as PRId,
      offerId: offer.id as OfferId,
      orderId: order.id,
      providerInstanceId: provider.id,
      externalOrderId,
      dispatchSeed: {
        providerInstanceId: provider.id,
        providerType: "CAOCAO",
        externalOrderId,
        submittedAt: "2031-01-01T00:00:00.000Z",
        submissionMode: "SINGLE_CANDIDATE",
        submittedCandidates: [],
      },
      status: "SUBMITTING",
      providerRequestStartedAt: new Date("2031-01-01T00:00:00.000Z"),
    });

    const confirmation = {
      orderId: order.id as TradeOrderId,
      providerInstanceId: provider.id as RideHailingProviderInstanceId,
      externalOrderId,
      providerOrderId: "CC-ATTEMPT-1",
      providerSnapshot: { source: "callback" },
    };
    assert.deepEqual(await confirmRideCreateAttemptFromProvider(confirmation), { recovered: true });
    assert.deepEqual(await confirmRideCreateAttemptFromProvider(confirmation), { recovered: true });

    const recoveredAttempt = await new CreateOrderAttemptRepository().findById(
      attempt.id as CreateOrderAttemptId,
    );
    const recoveredOrder = await new TradeOrderRepository().findById(order.id);
    const recoveredRide = await new RideHailingOrderRepository().findByOrderId(order.id);
    assert.equal(recoveredAttempt?.status, "SUCCEEDED");
    assert.equal(recoveredAttempt?.providerOrderId, "CC-ATTEMPT-1");
    assert.equal(recoveredAttempt?.resultSnapshot?.outcome, "CREATED");
    assert.equal(recoveredOrder?.status, "OPEN");
    assert.equal(recoveredRide?.executionPhase, "DISPATCHING");
    assert.equal(recoveredRide?.dispatchBinding?.providerOrderId, "CC-ATTEMPT-1");

    ctx.record("attemptId", attempt.id);
    ctx.record("orderId", order.id);
    ctx.record("providerInstanceId", provider.id);
  },
);
