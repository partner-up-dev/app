import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Page } from "playwright";
import { installScenarioUserSession } from "../_infra/browser/session";
import { installDeterministicShareSidecarStubs } from "../_infra/browser/share-sidecars";
import { withScenarioPage } from "../_infra/browser/browser";
import { getScenarioEnvironment } from "../_infra/environment/scenario-environment";
import { scenario } from "../_infra/scenario/scenario";
import {
  bindScenarioWeChatOpenId,
  configurePRStatus,
} from "../../../apps/backend/tests/pr-core/_kit/actions/system-state";
import {
  givenUser,
  type ScenarioUser,
} from "../../../apps/backend/tests/pr-core/_kit/builders/users";
import {
  createOffer,
  createPlacement,
  createProductSpu,
  type PricingModel,
  type SkuFacts,
} from "../../../apps/backend/src/domains/merchandising";
import { registerPaymentProviderInstance } from "../../../apps/backend/src/domains/payment";
import { registerRideHailingProviderInstance } from "../../../apps/backend/src/domains/ride-hailing";
import type { PRRoute } from "../../../apps/backend/src/entities/partner-request";
import { PartnerRepository } from "../../../apps/backend/src/repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../apps/backend/src/repositories/PartnerRequestRepository";
import { ProductSkuRepository } from "../../../apps/backend/src/repositories/ProductSkuRepository";

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
        type: "EXACTLY_ONE",
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

async function openRideHailingOrderingFromPr(input: {
  page: Page;
  prId: number;
}): Promise<void> {
  await input.page.goto(`/pr/${input.prId}`);
  await input.page.getByTestId("pr-detail.commerce-placement.open").click();
  await input.page.getByTestId("ordering.ride-hailing.page").waitFor({
    state: "visible",
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
}

async function selectPremierVehicle(page: Page): Promise<void> {
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
    label: "RideHailing price range",
    pattern: /￥36\.00~52\.00/,
  });
  await vehicleCards.filter({ hasText: "系统曹操专车" }).click();
  await page.getByTestId("ordering.ride-hailing.vehicle-card.selected").waitFor({
    state: "visible",
    timeout: 10_000,
  });
}

async function assertRideHailingSupportHandoff(page: Page): Promise<void> {
  await page.getByTestId("ordering.support.page").waitFor({
    state: "visible",
    timeout: 10_000,
  });
  assert.equal(new URL(page.url()).pathname, "/order/support");
  await page.getByTestId("ordering.support.contact.open").waitFor({
    state: "visible",
    timeout: 10_000,
  });

  const summaryText =
    (await page
      .getByTestId("ordering.support.summary-card")
      .first()
      .textContent()) ?? "";
  assert.ok(
    summaryText.includes("系统曹操出行"),
    `Ordering support summary should include ride hailing title, got "${summaryText}"`,
  );
  assert.ok(
    summaryText.includes("专车"),
    `Ordering support summary should include selected vehicle, got "${summaryText}"`,
  );
  assert.match(summaryText, /52\.00/);
}

scenario(
  "commerce_ride_hailing_ordering_reaches_support_handoff",
  async (ctx) => {
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
      await selectPremierVehicle(page);

      await page.getByTestId("ordering.ride-hailing.create-order").click();
      await assertRideHailingSupportHandoff(page);
      orderPath = new URL(page.url()).pathname;
    });

    const createdOrderPath = orderPath;
    assert.equal(createdOrderPath, "/order/support");
  },
);

scenario(
  "commerce_ride_hailing_provider_entry_reaches_support_handoff",
  async (ctx) => {
    await resetFakeCaocao();
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
      await selectPremierVehicle(page);
      await page.getByTestId("ordering.ride-hailing.create-order").click();
      await assertRideHailingSupportHandoff(page);
    });
  },
);
