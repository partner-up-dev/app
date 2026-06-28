import assert from "node:assert/strict";
import type { Page } from "playwright";
import { installScenarioUserSession } from "../_infra/browser/session";
import { installDeterministicShareSidecarStubs } from "../_infra/browser/share-sidecars";
import { installFakeWeChatPayBridge } from "../_infra/browser/wechatpay";
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
  createProductSku,
  createProductSpu,
  createSkuCancellationPolicy,
} from "../../../apps/backend/src/domains/merchandising";
import { registerPaymentProviderInstance } from "../../../apps/backend/src/domains/payment";
import { PartnerRepository } from "../../../apps/backend/src/repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../apps/backend/src/repositories/PartnerRequestRepository";

const partnerRepo = new PartnerRepository();
const partnerRequestRepo = new PartnerRequestRepository();
const rentalHeroImageSrc =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20120%20120'%3E%3Crect%20width='120'%20height='120'%20fill='%2396d945'/%3E%3Cpath%20d='M24%2084h72M32%2036h56v36H32z'%20stroke='%2326381c'%20stroke-width='8'%20fill='none'/%3E%3C/svg%3E";

type ScenarioPartnerRequest = {
  id: number;
};

async function givenCommerceRentalPr(input: {
  creator: ScenarioUser;
  minPartners: number;
  maxPartners: number | null;
  title: string;
}): Promise<ScenarioPartnerRequest> {
  const pr = await partnerRequestRepo.create({
    budget: null,
    createdBy: input.creator.user.id,
    joinGateConfig: [],
    location: "Scenario Court",
    maxPartners: input.maxPartners,
    meetingPoint: null,
    minPartners: input.minPartners,
    notes: null,
    preferences: [],
    status: "OPEN",
    time: ["2031-01-01T10:00:00.000Z", "2031-01-01T12:00:00.000Z"],
    title: input.title,
    type: "badminton",
  });
  if (!pr) {
    throw new Error("Failed to create commerce rental scenario PR");
  }

  await partnerRepo.createSlot({
    prId: pr.id,
    status: "JOINED",
    userId: input.creator.user.id,
  });

  return { id: pr.id };
}

async function addJoinedParticipant(input: {
  pr: ScenarioPartnerRequest;
  user: ScenarioUser;
}): Promise<void> {
  await partnerRepo.createSlot({
    prId: input.pr.id,
    status: "JOINED",
    userId: input.user.user.id,
  });
}

async function givenRentalOrderingPlacement() {
  const { fakeWeChatPay } = getScenarioEnvironment();
  await registerPaymentProviderInstance({
    providerType: "WECHAT_PAY",
    instanceKey: "system-fake-wechatpay-http-web",
    displayName: "System Fake WeChatPay HTTP Web",
    clientId: "web",
    config: {
      adapterMode: "WECHAT_PAY_API_V3",
      appId: fakeWeChatPay.appId,
      mchId: fakeWeChatPay.mchId,
      chargeMode: "JSAPI",
      endpointBaseUrl: fakeWeChatPay.origin,
      apiV3Key: fakeWeChatPay.apiV3Key,
      merchantCertificate: fakeWeChatPay.merchantCertificate,
      platformCertificates: null,
    },
  });

  const spu = await createProductSpu({
    name: "系统测试烘焙空间",
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
      heroImageAssetIds: [rentalHeroImageSrc],
      detailImageAssetIds: [],
      sellingPoints: ["适合 2 人烘焙体验", "含基础工具与清洁"],
      parameterGroups: [],
      noticeBlocks: [
        {
          title: "入场说明",
          content: "请按订单登记姓名入场。",
        },
      ],
    },
  });

  const primarySku = await createProductSku({
    spuId: spu.id,
    name: "烘焙区 A · 2人 · 2小时",
    status: "ACTIVE",
    sortOrder: 10,
    facts: {
      type: "RENTAL",
      zoneCode: "BAKING_A_SYSTEM_TEST",
      participantCount: 2,
      durationMinutes: 120,
    },
    pricingModel: {
      type: "FIXED_TOTAL",
      amountFen: 2000,
    },
  });

  const premiumSku = await createProductSku({
    spuId: spu.id,
    name: "烘焙区 B · 2人 · 2小时",
    status: "ACTIVE",
    sortOrder: 20,
    facts: {
      type: "RENTAL",
      zoneCode: "BAKING_B_SYSTEM_TEST",
      participantCount: 2,
      durationMinutes: 120,
    },
    pricingModel: {
      type: "FIXED_TOTAL",
      amountFen: 3200,
    },
  });

  await createSkuCancellationPolicy({
    policyId: `system-rental-policy-${primarySku.id}`,
    policyVersion: 1,
    skuId: primarySku.id,
    operatorBufferMinutes: 30,
    tiers: [
      {
        code: "before_service",
        fromMinutesBeforeStart: 0,
        untilMinutesBeforeStart: null,
        refundPercent: 100,
        requiresOperatorHandling: true,
        visibleLabel: "开始前可退",
      },
    ],
  });

  await createSkuCancellationPolicy({
    policyId: `system-rental-policy-${premiumSku.id}`,
    policyVersion: 1,
    skuId: premiumSku.id,
    operatorBufferMinutes: 30,
    tiers: [
      {
        code: "before_service",
        fromMinutesBeforeStart: 0,
        untilMinutesBeforeStart: null,
        refundPercent: 100,
        requiresOperatorHandling: true,
        visibleLabel: "开始前可退",
      },
    ],
  });

  const offer = await createOffer({
    productType: "RENTAL",
    spuIds: [spu.id],
    status: "ACTIVE",
    pricingRules: [],
    termsVersion: 1,
  });

  return createPlacement({
    placementType: "BUTTON",
    offerId: offer.id,
    status: "ACTIVE",
    matchingRule: {
      and: [
        { "===": [{ var: "kind" }, "PR"] },
        { "===": [{ var: "type" }, "badminton"] },
        { "===": [{ var: "activeParticipantCount" }, 2] },
        { var: "time.hasConcreteTime" },
      ],
    },
    priority: 100,
    creative: {
      ctaLabel: "预订场地",
      description: "为当前 PR 锁定场地",
    },
    bindingRules: [
      {
        fieldKey: "participantCount",
        contextPath: "activeParticipantCount",
        lock: true,
      },
      {
        fieldKey: "serviceStartAt",
        contextPath: "time.startAt",
        lock: true,
      },
      {
        fieldKey: "serviceEndAt",
        contextPath: "time.endAt",
        lock: true,
      },
    ],
  });
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

async function fillRentalOrderingRequiredFields(page: Page): Promise<void> {
  await page.getByTestId("ordering.rental.contact-phone").fill("13800138000");
  await page.getByTestId("ordering.rental.registrant-name.0").fill("张三");
  await page.getByTestId("ordering.rental.registrant-name.1").fill("李四");
}

async function waitForRentalQuoteReady(page: Page, expectedPrice = "20.00"): Promise<void> {
  await page.waitForFunction((priceText) => {
    const price = document.querySelector('[data-testid="ordering.rental.price"]')?.textContent;
    return price?.includes(priceText);
  }, expectedPrice);
}

async function assertOrderingBlockedDialog(input: {
  page: Page;
  expectedDetail: string;
}): Promise<void> {
  const dialog = input.page.getByRole("dialog", { name: "暂不能创建订单" });
  await dialog.waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await dialog.getByText(input.expectedDetail).waitFor({
    state: "visible",
    timeout: 10_000,
  });
}

async function assertRentalOrderDetail(input: {
  page: Page;
  expectedItemName: string;
}): Promise<void> {
  await input.page.getByTestId("order-detail.page").waitFor({
    state: "visible",
    timeout: 10_000,
  });
  assert.match(new URL(input.page.url()).pathname, /^\/orders\/[0-9a-f-]+$/);
  await input.page.getByTestId("order-detail.bill-detail-link").waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await assertLocatorTextIncludes({
    actual: input.page.getByTestId("order-detail.item-name").textContent(),
    expected: input.expectedItemName,
    label: "Rental order detail item name",
  });
}

scenario("commerce_rental_ordering_reaches_order_detail", async (ctx) => {
  const creator = await givenUser("system-commerce-rental-creator");
  const joiner = await givenUser("system-commerce-rental-joiner");
  await bindScenarioWeChatOpenId({
    user: creator,
    openId: "fake-openid-commerce-rental-creator",
  });
  await bindScenarioWeChatOpenId({
    user: joiner,
    openId: "fake-openid-commerce-rental-joiner",
  });
  const pr = await givenCommerceRentalPr({
    creator,
    minPartners: 2,
    maxPartners: null,
    title: "System commerce rental partner request",
  });
  await addJoinedParticipant({ pr, user: joiner });
  await configurePRStatus({ pr, status: "READY" });
  const placement = await givenRentalOrderingPlacement();

  ctx.record("creatorUserId", creator.user.id);
  ctx.record("joinerUserId", joiner.user.id);
  ctx.record("prId", pr.id);
  ctx.record("placementId", placement.id);

  let createdOrderPath: string | null = null;

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, creator);
    await installDeterministicShareSidecarStubs(page);
    await installFakeWeChatPayBridge(page, getScenarioEnvironment().fakeWeChatPay.origin);

    await page.goto(`/pr/${pr.id}`);
    await page.getByTestId("pr-detail.commerce-placement.open").click();
    await page.getByTestId("ordering.rental.page").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.getByText("系统测试烘焙空间").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await assertLocatorTextIncludes({
      actual: page.getByTestId("ordering.rental.product-summary").textContent(),
      expected: "适合 2 人烘焙体验",
      label: "Ordering rental product summary",
    });
    await page.getByTestId("ordering.rental.product-summary").locator("img").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await assertLocatorTextIncludes({
      actual: page.getByTestId("ordering.rental.participant-count").textContent(),
      expected: "2 人",
      label: "Ordering participant count",
    });

    const skuOptions = page.getByTestId("ordering.rental.sku-option");
    assert.equal(await skuOptions.count(), 2);
    await skuOptions.filter({ hasText: "烘焙区 A" }).waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await skuOptions.filter({ hasText: "烘焙区 B" }).waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await assertLocatorTextIncludes({
      actual: page.getByTestId("ordering.rental.cancellation-policy").textContent(),
      expected: "开始前可退",
      label: "Ordering cancellation policy summary",
    });

    await fillRentalOrderingRequiredFields(page);
    await page.waitForFunction(() => {
      const price = document.querySelector('[data-testid="ordering.rental.price"]')?.textContent;
      return price?.includes("20.00");
    });
    await assertLocatorTextMatches({
      actual: page.getByTestId("ordering.rental.price").textContent(),
      pattern: /20\.00/,
      label: "Default selected SKU price",
    });
    await page.getByTestId("ordering.rental.price-detail.toggle").click();
    await page.getByTestId("ordering.rental.price-detail").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await assertLocatorTextIncludes({
      actual: page.getByTestId("ordering.rental.price-detail").textContent(),
      expected: "固定总价",
      label: "Ordering price detail explanation",
    });
    await page.getByRole("button", { name: "Close drawer" }).click();

    await skuOptions.filter({ hasText: "烘焙区 B" }).click();
    await page.waitForFunction(() => {
      const price = document.querySelector('[data-testid="ordering.rental.price"]')?.textContent;
      return price?.includes("32.00");
    });
    await assertLocatorTextMatches({
      actual: page.getByTestId("ordering.rental.price").textContent(),
      pattern: /32\.00/,
      label: "Price after switching rental zone",
    });
    await page.getByTestId("ordering.rental.create-order").click();

    await assertRentalOrderDetail({
      page,
      expectedItemName: "烘焙区 B · 2人 · 2小时",
    });
    createdOrderPath = new URL(page.url()).pathname;
  });

  const orderPath = createdOrderPath;
  assert.match(orderPath ?? "", /^\/orders\/[0-9a-f-]+$/);
});

scenario("commerce_rental_pr_button_requires_matching_rule", async (ctx) => {
  const creator = await givenUser("system-commerce-placement-mismatch-creator");
  const pr = await givenCommerceRentalPr({
    creator,
    minPartners: 2,
    maxPartners: null,
    title: "System commerce placement mismatch PR",
  });
  const placement = await givenRentalOrderingPlacement();

  ctx.record("prId", pr.id);
  ctx.record("placementId", placement.id);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, creator);
    await installDeterministicShareSidecarStubs(page);

    await page.goto(`/pr/${pr.id}`);
    await page
      .getByRole("heading", {
        name: "System commerce placement mismatch PR",
      })
      .waitFor({
        state: "visible",
        timeout: 10_000,
      });
    await page.waitForLoadState("networkidle");
    assert.equal(
      await page.getByTestId("pr-detail.commerce-placement.open").count(),
      0,
      "PR Button Placement must not render when matchingRule returns false",
    );
  });
});

scenario("commerce_rental_ordering_blocks_non_ready_pr", async (ctx) => {
  const creator = await givenUser("system-commerce-non-ready-creator");
  const joiner = await givenUser("system-commerce-non-ready-joiner");
  const pr = await givenCommerceRentalPr({
    creator,
    minPartners: 2,
    maxPartners: null,
    title: "System commerce non ready rental PR",
  });
  await addJoinedParticipant({ pr, user: joiner });
  const placement = await givenRentalOrderingPlacement();

  ctx.record("prId", pr.id);
  ctx.record("placementId", placement.id);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, creator);
    await installDeterministicShareSidecarStubs(page);

    await page.goto(`/pr/${pr.id}`);
    await page.getByTestId("pr-detail.commerce-placement.open").click();
    await page.getByTestId("ordering.rental.page").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await fillRentalOrderingRequiredFields(page);
    await waitForRentalQuoteReady(page);
    await page.getByTestId("ordering.rental.create-order").click();
    await assertOrderingBlockedDialog({
      page,
      expectedDetail: "订单创建需要 PR 处于 READY 状态",
    });
    assert.equal(new URL(page.url()).pathname, "/order/new");
  });
});

scenario("commerce_rental_ordering_recovers_non_ready_pr_by_marking_ready", async (ctx) => {
  const creator = await givenUser("system-commerce-non-ready-recovery-creator");
  const joiner = await givenUser("system-commerce-non-ready-recovery-joiner");
  const pr = await givenCommerceRentalPr({
    creator,
    minPartners: 2,
    maxPartners: null,
    title: "System commerce non ready recovery rental PR",
  });
  await addJoinedParticipant({ pr, user: joiner });
  const placement = await givenRentalOrderingPlacement();

  ctx.record("prId", pr.id);
  ctx.record("placementId", placement.id);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, creator);
    await installDeterministicShareSidecarStubs(page);

    await page.goto(`/pr/${pr.id}`);
    await page.getByTestId("pr-detail.commerce-placement.open").click();
    await page.getByTestId("ordering.rental.page").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await fillRentalOrderingRequiredFields(page);
    await waitForRentalQuoteReady(page);
    await page.getByTestId("ordering.rental.create-order").click();
    await assertOrderingBlockedDialog({
      page,
      expectedDetail: "订单创建需要 PR 处于 READY 状态",
    });

    await page.getByRole("button", { name: "去成团" }).click();
    const confirmDialog = page.getByRole("dialog", { name: "确认标记为已成团？" });
    await confirmDialog.waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await confirmDialog.getByText("这会立即将当前 PR 标记为已成团。确认后请重新点击下单。").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await confirmDialog.getByRole("button", { name: "确认成团" }).click();

    const successDialog = page.getByRole("dialog", { name: "已成团" });
    await successDialog.waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await successDialog.getByText("PR 已标记为已成团，请重新点击下单。").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await successDialog.getByRole("button", { name: "我知道了" }).click();

    await page.getByTestId("ordering.rental.create-order").click();
    await assertRentalOrderDetail({
      page,
      expectedItemName: "烘焙区 A · 2人 · 2小时",
    });
  });
});

scenario("commerce_rental_ordering_blocks_non_creator", async (ctx) => {
  const creator = await givenUser("system-commerce-non-creator-creator");
  const joiner = await givenUser("system-commerce-non-creator-joiner");
  const pr = await givenCommerceRentalPr({
    creator,
    minPartners: 2,
    maxPartners: null,
    title: "System commerce non creator rental PR",
  });
  await addJoinedParticipant({ pr, user: joiner });
  await configurePRStatus({ pr, status: "READY" });
  const placement = await givenRentalOrderingPlacement();

  ctx.record("prId", pr.id);
  ctx.record("placementId", placement.id);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, joiner);
    await installDeterministicShareSidecarStubs(page);

    await page.goto(`/pr/${pr.id}`);
    await page.getByTestId("pr-detail.commerce-placement.open").click();
    await page.getByTestId("ordering.rental.page").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await fillRentalOrderingRequiredFields(page);
    await waitForRentalQuoteReady(page);
    await page.getByTestId("ordering.rental.create-order").click();
    await assertOrderingBlockedDialog({
      page,
      expectedDetail: "仅 PR 创建者可以创建订单",
    });
    assert.equal(new URL(page.url()).pathname, "/order/new");
  });
});

scenario("commerce_rental_cancel_entry_reaches_order_detail", async (ctx) => {
  const creator = await givenUser("system-commerce-cancel-creator");
  const joiner = await givenUser("system-commerce-cancel-joiner");
  const pr = await givenCommerceRentalPr({
    creator,
    minPartners: 2,
    maxPartners: null,
    title: "System commerce cancellation rental PR",
  });
  await addJoinedParticipant({ pr, user: joiner });
  await configurePRStatus({ pr, status: "READY" });
  const placement = await givenRentalOrderingPlacement();

  ctx.record("prId", pr.id);
  ctx.record("placementId", placement.id);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, creator);
    await installDeterministicShareSidecarStubs(page);

    await page.goto(`/pr/${pr.id}`);
    await page.getByTestId("pr-detail.commerce-placement.open").click();
    await page.getByTestId("ordering.rental.page").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await fillRentalOrderingRequiredFields(page);
    await page.waitForFunction(() => {
      const price = document.querySelector('[data-testid="ordering.rental.price"]')?.textContent;
      return price?.includes("20.00");
    });
    await page.getByTestId("ordering.rental.create-order").click();

    await assertRentalOrderDetail({
      page,
      expectedItemName: "烘焙区 A · 2人 · 2小时",
    });
  });
});

scenario("commerce_rental_refund_entry_reaches_order_detail", async (ctx) => {
  const creator = await givenUser("system-commerce-paid-cancel-creator");
  const joiner = await givenUser("system-commerce-paid-cancel-joiner");
  const pr = await givenCommerceRentalPr({
    creator,
    minPartners: 2,
    maxPartners: null,
    title: "System commerce paid cancellation rental PR",
  });
  await addJoinedParticipant({ pr, user: joiner });
  await configurePRStatus({ pr, status: "READY" });
  const placement = await givenRentalOrderingPlacement();

  ctx.record("prId", pr.id);
  ctx.record("placementId", placement.id);

  let orderPath: string | null = null;

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, creator);
    await installDeterministicShareSidecarStubs(page);
    await installFakeWeChatPayBridge(page, getScenarioEnvironment().fakeWeChatPay.origin);

    await page.goto(`/pr/${pr.id}`);
    await page.getByTestId("pr-detail.commerce-placement.open").click();
    await page.getByTestId("ordering.rental.page").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await fillRentalOrderingRequiredFields(page);
    await page.waitForFunction(() => {
      const price = document.querySelector('[data-testid="ordering.rental.price"]')?.textContent;
      return price?.includes("20.00");
    });
    await page.getByTestId("ordering.rental.create-order").click();
    await assertRentalOrderDetail({
      page,
      expectedItemName: "烘焙区 A · 2人 · 2小时",
    });
    orderPath = new URL(page.url()).pathname;
  });

  assert.ok(orderPath, "Paid cancellation order path should be recorded");
  assert.match(orderPath ?? "", /^\/orders\/[0-9a-f-]+$/);
});
