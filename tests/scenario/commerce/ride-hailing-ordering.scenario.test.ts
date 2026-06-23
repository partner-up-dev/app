import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Page } from "playwright";
import {
  createOffer,
  createPlacement,
  createProductSpu,
  type PricingModel,
  type SkuFacts,
} from "../../../apps/backend/src/domains/merchandising";
import { registerPaymentProviderInstance } from "../../../apps/backend/src/domains/payment";
import { registerRideHailingProviderInstance } from "../../../apps/backend/src/domains/ride-hailing";
import { commerceQuotes } from "../../../apps/backend/src/entities/commerce-quote";
import type { PRRoute } from "../../../apps/backend/src/entities/partner-request";
import { db } from "../../../apps/backend/src/lib/db";
import { PartnerRepository } from "../../../apps/backend/src/repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../apps/backend/src/repositories/PartnerRequestRepository";
import { ProductSkuRepository } from "../../../apps/backend/src/repositories/ProductSkuRepository";
import {
  bindScenarioWeChatOpenId,
  configurePRStatus,
} from "../../../apps/backend/tests/pr-core/_kit/actions/system-state";
import {
  givenUser,
  type ScenarioUser,
} from "../../../apps/backend/tests/pr-core/_kit/builders/users";
import { withScenarioPage } from "../_infra/browser/browser";
import { installScenarioUserSession } from "../_infra/browser/session";
import { installDeterministicShareSidecarStubs } from "../_infra/browser/share-sidecars";
import { getScenarioEnvironment } from "../_infra/environment/scenario-environment";
import { scenario } from "../_infra/scenario/scenario";

const partnerRepo = new PartnerRepository();
const partnerRequestRepo = new PartnerRequestRepository();
const productSkuRepo = new ProductSkuRepository();

type ScenarioRideHailingPr = {
  id: number;
};

type FutureRideHailingSkuFacts = {
  rideHailingProviderInstanceId: string;
  providerVehicleTypeCode: string;
};

const rideHailingRoute: PRRoute = [
  {
    bd09: null,
    full_address: "杭州市上城区全福桥路2号",
    gcj02: [30.2912, 120.212],
    name: "杭州东站",
    wgs84: null,
  },
  {
    bd09: null,
    full_address: "杭州市西湖区灵隐路1号",
    gcj02: [30.24, 120.102],
    name: "灵隐寺",
    wgs84: null,
  },
];

const providerEstimatePricingModel: PricingModel = {
  type: "DYNAMIC_QUOTE",
  calculatorSpec: {
    components: [
      {
        amount: {
          path: "provider.estimateAmountFen",
          type: "INPUT",
        },
        id: "caocao-provider-estimate",
        label: "曹操预估价",
      },
    ],
    currency: "CNY",
    version: 1,
  },
};

const asCurrentSkuFacts = (facts: FutureRideHailingSkuFacts): SkuFacts =>
  facts as unknown as SkuFacts;

async function resetFakeCaocao(): Promise<void> {
  const { fakeCaocao } = getScenarioEnvironment();
  await fetch(new URL("/__fake_caocao/reset", fakeCaocao.origin), {
    method: "POST",
  });
}

async function armFakeCaocaoCreateFailure(): Promise<void> {
  const { fakeCaocao } = getScenarioEnvironment();
  await fetch(new URL("/__fake_caocao/create-failure/next", fakeCaocao.origin), {
    method: "POST",
  });
}

async function setFakeCaocaoEstimateAvailability(input: {
  carType: string;
  available: boolean;
}): Promise<void> {
  const { fakeCaocao } = getScenarioEnvironment();
  const response = await fetch(
    new URL("/__fake_caocao/estimates/availability", fakeCaocao.origin),
    {
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );
  assert.equal(response.ok, true);
}

async function readFakeCaocaoOrderCount(): Promise<number> {
  return (await readFakeCaocaoOrders()).length;
}

async function readFakeCaocaoOrders(): Promise<
  Array<{
    providerOrderId: string;
    phase: string;
  }>
> {
  const { fakeCaocao } = getScenarioEnvironment();
  const response = await fetch(new URL("/__fake_caocao/state", fakeCaocao.origin));
  assert.equal(response.ok, true);
  const body = (await response.json()) as { orders?: unknown[] };
  assert.ok(Array.isArray(body.orders));
  return body.orders.map((order) => {
    assert.equal(typeof order, "object");
    assert.notEqual(order, null);
    const record = order as Record<string, unknown>;
    assert.equal(typeof record.providerOrderId, "string");
    assert.equal(typeof record.phase, "string");
    return {
      phase: record.phase,
      providerOrderId: record.providerOrderId,
    };
  });
}

async function advanceLatestFakeCaocaoOrder(): Promise<{
  providerOrderId: string;
  phase: string;
}> {
  const { fakeCaocao } = getScenarioEnvironment();
  const response = await fetch(new URL("/__fake_caocao/orders/latest/advance", fakeCaocao.origin), {
    method: "POST",
  });
  assert.equal(response.ok, true);
  const body = (await response.json()) as {
    order?: {
      providerOrderId?: unknown;
      phase?: unknown;
    };
  };
  assert.equal(typeof body.order?.providerOrderId, "string");
  assert.equal(typeof body.order?.phase, "string");
  return {
    phase: body.order.phase,
    providerOrderId: body.order.providerOrderId,
  };
}

async function setFakeCaocaoOrderPhase(input: {
  providerOrderId: string;
  phase: "ACCEPTED" | "ARRIVED_AT_PICKUP" | "IN_TRIP" | "FINISHED";
}): Promise<{
  providerOrderId: string;
  phase: string;
}> {
  const { fakeCaocao } = getScenarioEnvironment();
  const response = await fetch(
    new URL(
      `/__fake_caocao/orders/${encodeURIComponent(input.providerOrderId)}/phase`,
      fakeCaocao.origin,
    ),
    {
      body: new URLSearchParams({ phase: input.phase }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    },
  );
  assert.equal(response.ok, true);
  const body = (await response.json()) as {
    order?: {
      providerOrderId?: unknown;
      phase?: unknown;
    };
  };
  assert.equal(typeof body.order?.providerOrderId, "string");
  assert.equal(typeof body.order?.phase, "string");
  return {
    phase: body.order.phase,
    providerOrderId: body.order.providerOrderId,
  };
}

async function expireCommerceQuotes(): Promise<number> {
  const before = await db.select().from(commerceQuotes);
  await db.update(commerceQuotes).set({
    expiresAt: new Date(Date.now() - 1000),
  });
  return before.length;
}

async function waitForCommerceQuoteCountAtLeast(expected: number): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const quotes = await db.select().from(commerceQuotes);
    if (quotes.length >= expected) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const quotes = await db.select().from(commerceQuotes);
  assert.ok(
    quotes.length >= expected,
    `Expected at least ${expected} commerce quotes, got ${quotes.length}`,
  );
}

async function givenRideHailingPr(input: {
  creator: ScenarioUser;
  title: string;
}): Promise<ScenarioRideHailingPr> {
  const pr = await partnerRequestRepo.create({
    budget: null,
    createdBy: input.creator.user.id,
    joinGateConfig: [],
    location: null,
    maxPartners: null,
    meetingPoint: null,
    minPartners: 1,
    notes: null,
    preferences: ["安静"],
    route: rideHailingRoute,
    status: "OPEN",
    time: ["2031-04-01T02:00:00.000Z", "2031-04-01T03:00:00.000Z"],
    title: input.title,
    type: "ride-hailing-system-scenario",
  });
  if (!pr) {
    throw new Error("Failed to create RideHailing scenario PR");
  }

  await partnerRepo.createSlot({
    prId: pr.id,
    status: "JOINED",
    userId: input.creator.user.id,
  });

  return { id: pr.id };
}

async function registerScenarioPaymentProvider(): Promise<void> {
  const { fakeWeChatPay } = getScenarioEnvironment();
  await registerPaymentProviderInstance({
    clientId: "web",
    config: {
      adapterMode: "WECHAT_PAY_API_V3",
      apiV3Key: fakeWeChatPay.apiV3Key,
      appId: fakeWeChatPay.appId,
      chargeMode: "JSAPI",
      endpointBaseUrl: fakeWeChatPay.origin,
      mchId: fakeWeChatPay.mchId,
      merchantCertificate: fakeWeChatPay.merchantCertificate,
      platformCertificates: null,
    },
    displayName: "System Fake WeChatPay HTTP Web",
    instanceKey: "system-fake-wechatpay-http-web",
    providerType: "WECHAT_PAY",
  });
}

async function givenRideHailingOrderingPlacement(): Promise<{
  placementId: number;
  providerInstanceId: string;
}> {
  const { backendBaseUrl, fakeCaocao } = getScenarioEnvironment();
  const provider = await registerRideHailingProviderInstance({
    config: {
      adapterMode: "CAOCAO_OPEN_API",
      callbackBaseUrl: backendBaseUrl,
      caocaoClientId: fakeCaocao.clientId,
      endpointBaseUrl: fakeCaocao.origin,
      signKey: fakeCaocao.signKey,
    },
    displayName: "系统曹操",
    instanceKey: `system-caocao-${randomUUID()}`,
    providerType: "CAOCAO",
  });

  const spu = await createProductSpu({
    name: "系统曹操出行",
    productType: "RIDE_HAILING",
    presentation: {
      detailImageAssetIds: [],
      heroImageAssetIds: [],
      noticeBlocks: [],
      parameterGroups: [],
      sellingPoints: ["曹操实时预估", "行程结束后按实际费用结算"],
    },
    salesPolicy: {
      quantityPolicy: {
        quantity: 1,
        type: "FIXED",
      },
      skuSelectionPolicy: {
        type: "CHOICE_SET",
        min: 1,
        max: null,
        resolvesTo: 1,
      },
    },
    servicePolicy: {
      type: "RIDE_HAILING",
    },
    status: "ACTIVE",
  });

  await productSkuRepo.create({
    facts: asCurrentSkuFacts({
      providerVehicleTypeCode: "EXPRESS",
      rideHailingProviderInstanceId: provider.providerInstanceId,
    }),
    name: "快车",
    pricingModel: providerEstimatePricingModel,
    sortOrder: 10,
    spuId: spu.id,
    status: "ACTIVE",
  });

  await productSkuRepo.create({
    facts: asCurrentSkuFacts({
      providerVehicleTypeCode: "PREMIER",
      rideHailingProviderInstanceId: provider.providerInstanceId,
    }),
    name: "专车",
    pricingModel: providerEstimatePricingModel,
    sortOrder: 20,
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

  const placement = await createPlacement({
    bindingRules: [
      {
        contextPath: "route",
        fieldKey: "route",
        lock: true,
      },
    ],
    creative: {
      ctaLabel: "叫曹操",
      description: "按当前路线预估网约车费用",
    },
    matchingRule: {
      and: [
        { "===": [{ var: "kind" }, "PR"] },
        { "===": [{ var: "type" }, "ride-hailing-system-scenario"] },
        { "===": [{ var: "status" }, "READY"] },
        { var: "hasRoute" },
        { var: "time.hasConcreteTime" },
      ],
    },
    placementType: "BUTTON",
    offerId: offer.id,
    priority: 100,
    status: "ACTIVE",
  });

  return {
    placementId: placement.id,
    providerInstanceId: provider.providerInstanceId,
  };
}

async function assertLocatorTextIncludes(input: {
  actual: Promise<string | null>;
  expected: string;
  label: string;
}): Promise<void> {
  const actual = (await input.actual) ?? "";
  assert.ok(
    actual.includes(input.expected),
    `${input.label}: expected text to include "${input.expected}", got "${actual}"`,
  );
}

async function assertLocatorTextMatches(input: {
  actual: Promise<string | null>;
  pattern: RegExp;
  label: string;
}): Promise<void> {
  const actual = (await input.actual) ?? "";
  assert.match(actual, input.pattern, input.label);
}

async function openRideHailingOrderingFromPr(input: { page: Page; prId: number }): Promise<void> {
  await input.page.goto(`/pr/${input.prId}`);
  await input.page.getByTestId("pr-detail.commerce-placement.open").click();
  await input.page.getByTestId("ordering.ride-hailing.page").waitFor({
    state: "visible",
    timeout: 10_000,
  });
}

const waitForOfferListingResponse = (page: Page): Promise<unknown> =>
  page.waitForResponse(
    (response) => {
      const url = new URL(response.url());
      return (
        response.request().method() === "POST" &&
        /^\/api\/commerce\/offers\/\d+\/listing$/.test(url.pathname) &&
        response.status() === 200
      );
    },
    { timeout: 10_000 },
  );

async function openRideHailingOrderingFromPrAndWaitForListing(input: {
  page: Page;
  prId: number;
}): Promise<void> {
  const listingResponse = waitForOfferListingResponse(input.page);
  await openRideHailingOrderingFromPr(input);
  await listingResponse;
}

async function waitForVehicleCardCount(page: Page, expected: number): Promise<void> {
  const vehicleCards = page.getByTestId("ordering.ride-hailing.vehicle-card");
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if ((await vehicleCards.count()) === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(await vehicleCards.count(), expected);
}

async function keepDepartNowIfPrompted(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog").filter({ hasText: "使用带入的出发时间？" });
  const visible = await dialog
    .waitFor({
      state: "visible",
      timeout: 1_000,
    })
    .then(() => true)
    .catch(() => false);
  if (!visible) return;
  await dialog.getByText(/2031\/04\/01.*10:00/).waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await dialog.getByRole("button", { name: "现在出发", exact: true }).click();
  await dialog.waitFor({
    state: "hidden",
    timeout: 10_000,
  });
}

async function assertRideHailingOrderingContent(page: Page): Promise<void> {
  await page.getByTestId("ordering.ride-hailing.route-map").waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await page.getByTestId("ordering.ride-hailing.bottom-sheet").waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await assertLocatorTextMatches({
    actual: page.getByTestId("ordering.ride-hailing.departure-time").textContent(),
    label: "RideHailing departure row",
    pattern: /(现在|\d{2}:\d{2})出发/,
  });
  await assertLocatorTextIncludes({
    actual: page.getByTestId("ordering.ride-hailing.riders").textContent(),
    expected: "同乘人",
    label: "RideHailing riders row",
  });
  await page.getByTestId("ordering.ride-hailing.price-detail.toggle").waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await keepDepartNowIfPrompted(page);
}

async function assertDepartureDrawerCanSwitchBetweenImportedAndNow(page: Page): Promise<void> {
  await page.getByTestId("ordering.ride-hailing.departure-time.open").click();
  await page.getByTestId("ordering.ride-hailing.departure-time.apply-imported").click();
  await assertLocatorTextMatches({
    actual: page.getByTestId("ordering.ride-hailing.departure-time").textContent(),
    label: "RideHailing imported departure row",
    pattern: /10:00出发/,
  });
  await page.getByTestId("ordering.ride-hailing.departure-time.use-now").click();
  await assertLocatorTextIncludes({
    actual: page.getByTestId("ordering.ride-hailing.departure-time").textContent(),
    expected: "现在出发",
    label: "RideHailing depart now row",
  });
  await page.keyboard.press("Escape");
}

async function selectPremierAsAdditionalCandidate(page: Page): Promise<void> {
  await keepDepartNowIfPrompted(page);
  const vehicleCards = page.getByTestId("ordering.ride-hailing.vehicle-card");
  await vehicleCards.first().waitFor({
    state: "visible",
    timeout: 10_000,
  });
  assert.equal(await vehicleCards.count(), 2);
  await vehicleCards.filter({ hasText: "系统曹操快车" }).waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await vehicleCards.filter({ hasText: "系统曹操专车" }).waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await assertLocatorTextMatches({
    actual: page.getByTestId("ordering.ride-hailing.quote-price-range").textContent(),
    label: "RideHailing default selected candidate price",
    pattern: /￥36\.00/,
  });
  await vehicleCards.filter({ hasText: "系统曹操专车" }).click();
  const selectedMarkers = page.getByTestId("ordering.ride-hailing.vehicle-card.selected");
  await selectedMarkers.first().waitFor({
    state: "visible",
    timeout: 10_000,
  });
  assert.equal(await selectedMarkers.count(), 2);
  await assertLocatorTextMatches({
    actual: page.getByTestId("ordering.ride-hailing.quote-price-range").textContent(),
    label: "RideHailing selected candidate range",
    pattern: /￥36\.00~52\.00/,
  });
}

async function assertRideHailingOrderDetail(page: Page): Promise<void> {
  await page.getByTestId("order-detail.page").waitFor({
    state: "visible",
    timeout: 10_000,
  });
  assert.match(new URL(page.url()).pathname, /^\/orders\/[0-9a-f-]+$/);
  await page.getByTestId("order-detail.ride-hailing.page").waitFor({
    state: "visible",
    timeout: 10_000,
  });
  const rawData = page.getByTestId("order-detail.ride-hailing.raw-data");
  await assertLocatorTextIncludes({
    actual: rawData.textContent(),
    expected: "系统曹操快车",
    label: "RideHailing raw selected vehicle",
  });
  await assertLocatorTextIncludes({
    actual: rawData.textContent(),
    expected: "杭州东站",
    label: "RideHailing raw route summary origin",
  });
  await assertLocatorTextIncludes({
    actual: rawData.textContent(),
    expected: "灵隐寺",
    label: "RideHailing raw route summary destination",
  });
}

async function waitForRideHailingMapMode(
  page: Page,
  mode: "SEARCHING_ORIGIN" | "PICKING_UP" | "ARRIVED_AT_PICKUP" | "IN_TRIP" | "PLANNED_ROUTE",
): Promise<void> {
  await page
    .locator(`[data-testid="order-detail.ride-hailing.page"][data-map-mode="${mode}"]`)
    .waitFor({
      state: "visible",
      timeout: 10_000,
    });
}

scenario("commerce_ride_hailing_ordering_reaches_order_detail", async (ctx) => {
  await resetFakeCaocao();
  const creator = await givenUser("system-ride-hailing-creator", {
    phoneNumber: "13800138000",
  });
  await bindScenarioWeChatOpenId({
    openId: "fake-openid-commerce-ride-hailing-creator",
    user: creator,
  });
  const pr = await givenRideHailingPr({
    creator,
    title: "System ride hailing partner request",
  });
  await configurePRStatus({ pr, status: "READY" });
  await registerScenarioPaymentProvider();
  const placement = await givenRideHailingOrderingPlacement();

  ctx.record("creatorUserId", creator.user.id);
  ctx.record("prId", pr.id);
  ctx.record("placementId", placement.placementId);
  ctx.record("providerInstanceId", placement.providerInstanceId);

  let orderPath: string | null = null;

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, creator);
    await installDeterministicShareSidecarStubs(page);

    await openRideHailingOrderingFromPr({ page, prId: pr.id });
    await assertRideHailingOrderingContent(page);
    await assertDepartureDrawerCanSwitchBetweenImportedAndNow(page);
    await selectPremierAsAdditionalCandidate(page);

    await page.getByTestId("ordering.ride-hailing.create-order").click();
    await assertRideHailingOrderDetail(page);
    await page.waitForTimeout(3500);
    const fakeOrders = await readFakeCaocaoOrders();
    assert.equal(fakeOrders.length, 1);
    assert.equal(fakeOrders[0]?.phase, "ACCEPTED");
    await waitForRideHailingMapMode(page, "SEARCHING_ORIGIN");

    const acceptedOrder = await setFakeCaocaoOrderPhase({
      providerOrderId: fakeOrders[0].providerOrderId,
      phase: "ACCEPTED",
    });
    assert.equal(acceptedOrder.phase, "ACCEPTED");
    await waitForRideHailingMapMode(page, "PICKING_UP");

    const arrivedOrder = await advanceLatestFakeCaocaoOrder();
    assert.equal(arrivedOrder.phase, "ARRIVED_AT_PICKUP");
    await waitForRideHailingMapMode(page, "ARRIVED_AT_PICKUP");

    const inTripOrder = await advanceLatestFakeCaocaoOrder();
    assert.equal(inTripOrder.phase, "IN_TRIP");
    await waitForRideHailingMapMode(page, "IN_TRIP");

    const finishedOrder = await advanceLatestFakeCaocaoOrder();
    assert.equal(finishedOrder.phase, "FINISHED");
    await waitForRideHailingMapMode(page, "PLANNED_ROUTE");
    await assertLocatorTextIncludes({
      actual: page.getByTestId("order-detail.ride-hailing.raw-data").textContent(),
      expected: '"bill"',
      label: "RideHailing raw data includes bill after finished",
    });

    orderPath = new URL(page.url()).pathname;
  });

  const createdOrderPath = orderPath;
  assert.match(createdOrderPath ?? "", /^\/orders\/[0-9a-f-]+$/);
});

scenario("commerce_ride_hailing_provider_create_failure_stays_on_ordering_page", async (ctx) => {
  await resetFakeCaocao();
  await armFakeCaocaoCreateFailure();
  const creator = await givenUser("system-ride-hailing-failure-creator", {
    phoneNumber: "13800138000",
  });
  const pr = await givenRideHailingPr({
    creator,
    title: "System ride hailing provider failure PR",
  });
  await configurePRStatus({ pr, status: "READY" });
  await registerScenarioPaymentProvider();
  const placement = await givenRideHailingOrderingPlacement();

  ctx.record("creatorUserId", creator.user.id);
  ctx.record("prId", pr.id);
  ctx.record("placementId", placement.placementId);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, creator);
    await installDeterministicShareSidecarStubs(page);

    await openRideHailingOrderingFromPr({ page, prId: pr.id });
    await selectPremierAsAdditionalCandidate(page);
    await page.getByTestId("ordering.ride-hailing.create-order").click();
    await page.getByTestId("ordering.ride-hailing.page").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.getByText("下单失败").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await assertLocatorTextIncludes({
      actual: page.locator("body").textContent(),
      expected: "Fake Caocao create failed",
      label: "RideHailing create failure dialog",
    });
    assert.equal(new URL(page.url()).pathname, "/order/new");
  });
});

scenario("commerce_ride_hailing_unavailable_provider_vehicle_is_hidden", async (ctx) => {
  await resetFakeCaocao();
  await setFakeCaocaoEstimateAvailability({
    carType: "PREMIER",
    available: false,
  });
  const creator = await givenUser("system-ride-hailing-unavailable-vehicle-creator", {
    phoneNumber: "13800138003",
  });
  await bindScenarioWeChatOpenId({
    openId: "fake-openid-commerce-ride-hailing-unavailable-vehicle-creator",
    user: creator,
  });
  const pr = await givenRideHailingPr({
    creator,
    title: "System ride hailing unavailable vehicle PR",
  });
  await configurePRStatus({ pr, status: "READY" });
  await registerScenarioPaymentProvider();
  const placement = await givenRideHailingOrderingPlacement();

  ctx.record("creatorUserId", creator.user.id);
  ctx.record("prId", pr.id);
  ctx.record("placementId", placement.placementId);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, creator);
    await installDeterministicShareSidecarStubs(page);

    await openRideHailingOrderingFromPrAndWaitForListing({ page, prId: pr.id });
    await assertRideHailingOrderingContent(page);
    await keepDepartNowIfPrompted(page);

    await waitForVehicleCardCount(page, 1);
    await page
      .getByTestId("ordering.ride-hailing.vehicle-card")
      .filter({
        hasText: "系统曹操快车",
      })
      .waitFor({
        state: "visible",
        timeout: 10_000,
      });
    await page
      .getByTestId("ordering.ride-hailing.vehicle-card")
      .filter({
        hasText: "系统曹操专车",
      })
      .waitFor({
        state: "hidden",
        timeout: 10_000,
      });
    await assertLocatorTextMatches({
      actual: page.getByTestId("ordering.ride-hailing.quote-price-range").textContent(),
      label: "RideHailing only available candidate price",
      pattern: /￥36\.00/,
    });

    await page.getByTestId("ordering.ride-hailing.create-order").click();
    await assertRideHailingOrderDetail(page);
    assert.equal(await readFakeCaocaoOrderCount(), 1);
  });
});

scenario("commerce_ride_hailing_quote_expired_refreshes_and_preserves_selection", async (ctx) => {
  await resetFakeCaocao();
  const creator = await givenUser("system-ride-hailing-quote-expired-creator", {
    phoneNumber: "13800138002",
  });
  await bindScenarioWeChatOpenId({
    openId: "fake-openid-commerce-ride-hailing-quote-expired-creator",
    user: creator,
  });
  const pr = await givenRideHailingPr({
    creator,
    title: "System ride hailing quote expired PR",
  });
  await configurePRStatus({ pr, status: "READY" });
  await registerScenarioPaymentProvider();
  const placement = await givenRideHailingOrderingPlacement();

  ctx.record("creatorUserId", creator.user.id);
  ctx.record("prId", pr.id);
  ctx.record("placementId", placement.placementId);
  ctx.record("providerInstanceId", placement.providerInstanceId);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, creator);
    await installDeterministicShareSidecarStubs(page);

    await openRideHailingOrderingFromPr({ page, prId: pr.id });
    await assertRideHailingOrderingContent(page);
    await selectPremierAsAdditionalCandidate(page);

    const quoteCountBeforeExpire = await expireCommerceQuotes();

    await page.getByTestId("ordering.ride-hailing.create-order").click();
    await page.getByRole("heading", { name: "报价已过期" }).waitFor({
      state: "visible",
      timeout: 10_000,
    });
    assert.equal(await readFakeCaocaoOrderCount(), 0);
    await waitForCommerceQuoteCountAtLeast(quoteCountBeforeExpire + 2);
    await page.getByRole("button", { name: "我知道了" }).click();

    const selectedMarkers = page.getByTestId("ordering.ride-hailing.vehicle-card.selected");
    await selectedMarkers.first().waitFor({
      state: "visible",
      timeout: 10_000,
    });
    assert.equal(await selectedMarkers.count(), 2);
    await page.getByTestId("ordering.ride-hailing.create-order").click();
    await assertRideHailingOrderDetail(page);
    assert.equal(await readFakeCaocaoOrderCount(), 1);
  });
});

scenario("commerce_ride_hailing_quote_refresh_prunes_unavailable_selected_vehicle", async (ctx) => {
  await resetFakeCaocao();
  const creator = await givenUser("system-ride-hailing-quote-prune-creator", {
    phoneNumber: "13800138004",
  });
  await bindScenarioWeChatOpenId({
    openId: "fake-openid-commerce-ride-hailing-quote-prune-creator",
    user: creator,
  });
  const pr = await givenRideHailingPr({
    creator,
    title: "System ride hailing quote prune PR",
  });
  await configurePRStatus({ pr, status: "READY" });
  await registerScenarioPaymentProvider();
  const placement = await givenRideHailingOrderingPlacement();

  ctx.record("creatorUserId", creator.user.id);
  ctx.record("prId", pr.id);
  ctx.record("placementId", placement.placementId);
  ctx.record("providerInstanceId", placement.providerInstanceId);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, creator);
    await installDeterministicShareSidecarStubs(page);

    await openRideHailingOrderingFromPr({ page, prId: pr.id });
    await assertRideHailingOrderingContent(page);
    await selectPremierAsAdditionalCandidate(page);

    const quoteCountBeforeExpire = await expireCommerceQuotes();
    await setFakeCaocaoEstimateAvailability({
      carType: "PREMIER",
      available: false,
    });

    await page.getByTestId("ordering.ride-hailing.create-order").click();
    await page.getByRole("heading", { name: "报价已过期" }).waitFor({
      state: "visible",
      timeout: 10_000,
    });
    assert.equal(await readFakeCaocaoOrderCount(), 0);
    await waitForCommerceQuoteCountAtLeast(quoteCountBeforeExpire + 1);
    await page.getByRole("button", { name: "我知道了" }).click();

    await waitForVehicleCardCount(page, 1);
    await page
      .getByTestId("ordering.ride-hailing.vehicle-card")
      .filter({
        hasText: "系统曹操专车",
      })
      .waitFor({
        state: "hidden",
        timeout: 10_000,
      });
    const selectedMarkers = page.getByTestId("ordering.ride-hailing.vehicle-card.selected");
    await selectedMarkers.first().waitFor({
      state: "visible",
      timeout: 10_000,
    });
    assert.equal(await selectedMarkers.count(), 1);
    await assertLocatorTextMatches({
      actual: page.getByTestId("ordering.ride-hailing.quote-price-range").textContent(),
      label: "RideHailing pruned candidate price",
      pattern: /￥36\.00/,
    });

    await page.getByTestId("ordering.ride-hailing.create-order").click();
    await assertRideHailingOrderDetail(page);
    assert.equal(await readFakeCaocaoOrderCount(), 1);
  });
});

scenario("commerce_ride_hailing_all_provider_vehicles_unavailable_blocks_ordering", async (ctx) => {
  await resetFakeCaocao();
  await setFakeCaocaoEstimateAvailability({
    carType: "EXPRESS",
    available: false,
  });
  await setFakeCaocaoEstimateAvailability({
    carType: "PREMIER",
    available: false,
  });
  const creator = await givenUser("system-ride-hailing-no-vehicles-creator", {
    phoneNumber: "13800138005",
  });
  await bindScenarioWeChatOpenId({
    openId: "fake-openid-commerce-ride-hailing-no-vehicles-creator",
    user: creator,
  });
  const pr = await givenRideHailingPr({
    creator,
    title: "System ride hailing no vehicles PR",
  });
  await configurePRStatus({ pr, status: "READY" });
  await registerScenarioPaymentProvider();
  const placement = await givenRideHailingOrderingPlacement();

  ctx.record("creatorUserId", creator.user.id);
  ctx.record("prId", pr.id);
  ctx.record("placementId", placement.placementId);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, creator);
    await installDeterministicShareSidecarStubs(page);

    await openRideHailingOrderingFromPrAndWaitForListing({ page, prId: pr.id });
    await assertRideHailingOrderingContent(page);
    await keepDepartNowIfPrompted(page);
    await waitForVehicleCardCount(page, 0);
    await assertLocatorTextIncludes({
      actual: page.getByTestId("ordering.ride-hailing.quote-price-range").textContent(),
      expected: "待确认",
      label: "RideHailing unavailable candidate price",
    });
    assert.equal(await page.getByTestId("ordering.ride-hailing.create-order").isDisabled(), true);
    assert.equal(await readFakeCaocaoOrderCount(), 0);
  });
});
