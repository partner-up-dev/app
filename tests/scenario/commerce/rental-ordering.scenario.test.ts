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
    pricingRules: [],
    presentation: {
      heroImageAssetIds: [],
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
        requiresOperatorHandling: false,
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
        requiresOperatorHandling: false,
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
    slotKey: "PR_UTILITY_ACTIONS_BUTTON",
    placementType: "BUTTON",
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
      title: "预订场地",
      subtitle: "为当前 PR 锁定场地",
      ctaLabel: "预订场地",
    },
    target: {
      kind: "OFFER",
      offerId: offer.id,
    },
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

async function waitForBillSettlementStatus(
  page: Page,
  expected: string,
): Promise<void> {
  await page.waitForFunction((label) => {
    const text = document.querySelector(
      '[data-testid="bill-detail.settlement-status"]',
    )?.textContent;
    return text?.includes(label);
  }, expected);
}

async function waitForBillLineCount(page: Page, expected: number): Promise<void> {
  await page.waitForFunction(
    ({ testId, expectedCount }) =>
      document.querySelectorAll(`[data-testid="${testId}"]`).length ===
      expectedCount,
    {
      testId: "bill-detail.line",
      expectedCount: expected,
    },
    { timeout: 10_000 },
  );
}

async function waitForOrderDetailText(input: {
  page: Page;
  testId: string;
  expected: string;
}): Promise<void> {
  await input.page.waitForFunction(
    ({ testId, expected }) => {
      const text = document.querySelector(
        `[data-testid="${testId}"]`,
      )?.textContent;
      return text?.includes(expected);
    },
    {
      testId: input.testId,
      expected: input.expected,
    },
  );
}

async function payFirstAvailableBillLine(input: {
  page: Page;
  amountPattern: RegExp;
  statusAfterReturn: string;
  label: string;
}): Promise<void> {
  await input.page.getByTestId("bill-detail.pay-line").first().click();
  await input.page.getByTestId("payment-checkout.page").waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await assertLocatorTextMatches({
    actual: input.page.getByTestId("payment-checkout.amount").textContent(),
    pattern: input.amountPattern,
    label: input.label,
  });
  await input.page.getByTestId("payment-checkout.create-charge").click();
  await input.page.getByTestId("payment-checkout.success").waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await input.page.getByTestId("payment-checkout.bill-link").click();
  await input.page.getByTestId("bill-detail.page").waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await waitForBillSettlementStatus(input.page, input.statusAfterReturn);
}

scenario(
  "commerce_rental_ordering_reaches_confirmed_fulfillment",
  async (ctx) => {
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
      await installFakeWeChatPayBridge(
        page,
        getScenarioEnvironment().fakeWeChatPay.origin,
      );

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
      await page.getByText("适合 2 人烘焙体验").waitFor({
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
        const price = document.querySelector(
          '[data-testid="ordering.rental.price"]',
        )?.textContent;
        return price?.includes("20.00");
      });
      await assertLocatorTextMatches({
        actual: page.getByTestId("ordering.rental.price").textContent(),
        pattern: /20\.00/,
        label: "Default selected SKU price",
      });
      await page.getByTestId("ordering.rental.price-detail.toggle").click();
      await assertLocatorTextIncludes({
        actual: page.getByTestId("ordering.rental.price-detail").textContent(),
        expected: "固定总价",
        label: "Ordering price detail explanation",
      });

      await skuOptions.filter({ hasText: "烘焙区 B" }).click();
      await page.waitForFunction(() => {
        const price = document.querySelector(
          '[data-testid="ordering.rental.price"]',
        )?.textContent;
        return price?.includes("32.00");
      });
      await assertLocatorTextMatches({
        actual: page.getByTestId("ordering.rental.price").textContent(),
        pattern: /32\.00/,
        label: "Price after switching rental zone",
      });
      await page.getByTestId("ordering.rental.create-order").click();

      await page.getByTestId("order-detail.page").waitFor({
        state: "visible",
        timeout: 10_000,
      });
      createdOrderPath = new URL(page.url()).pathname;
      await assertLocatorTextIncludes({
        actual: page.getByTestId("order-detail.item-name").textContent(),
        expected: "烘焙区 B",
        label: "Order detail selected SKU",
      });
      await assertLocatorTextIncludes({
        actual: page.getByTestId("order-detail.participant-count").textContent(),
        expected: "2 人",
        label: "Order detail participant count",
      });
      await assertLocatorTextMatches({
        actual: page.getByTestId("order-detail.total-price").textContent(),
        pattern: /32\.00/,
        label: "Order detail frozen total price",
      });
      assert.equal(await page.getByTestId("order-detail.bill-line").count(), 2);
      await assertLocatorTextIncludes({
        actual: page.getByTestId("order-detail.cancellation-policy").textContent(),
        expected: "开始前可退",
        label: "Order detail frozen cancellation policy",
      });
      await page.getByTestId("order-detail.payment-status").waitFor({
        state: "visible",
        timeout: 10_000,
      });
      await assertLocatorTextIncludes({
        actual: page.getByTestId("order-detail.payment-status").textContent(),
        expected: "待支付",
        label: "Initial payment status",
      });

      await page.goto(`/pr/${pr.id}`);
      await page.getByTestId("pr-detail.commerce-placement.open").click();
      await page.getByTestId("order-detail.page").waitFor({
        state: "visible",
        timeout: 10_000,
      });
      await assertLocatorTextIncludes({
        actual: page.getByTestId("order-detail.item-name").textContent(),
        expected: "烘焙区 B",
        label: "Existing order target routes back to order detail",
      });

      await page.getByTestId("order-detail.bill-detail-link").click();
      await page.getByTestId("bill-detail.page").waitFor({
        state: "visible",
        timeout: 10_000,
      });
      await waitForBillLineCount(page, 2);
      await page.getByTestId("bill-detail.pay-line").click();
      await page.getByTestId("payment-checkout.page").waitFor({
        state: "visible",
        timeout: 10_000,
      });
      await assertLocatorTextMatches({
        actual: page.getByTestId("payment-checkout.amount").textContent(),
        pattern: /16\.00/,
        label: "Creator bill line checkout amount",
      });
      await page.getByTestId("payment-checkout.create-charge").click();
      await page.getByTestId("payment-checkout.success").waitFor({
        state: "visible",
        timeout: 10_000,
      });
      await page.getByTestId("payment-checkout.bill-link").click();
      await page.getByTestId("bill-detail.page").waitFor({
        state: "visible",
        timeout: 10_000,
      });
      await waitForBillSettlementStatus(page, "部分已支付");
      await assertLocatorTextIncludes({
        actual: page.getByTestId("bill-detail.settlement-status").textContent(),
        expected: "部分已支付",
        label: "Bill status after creator payment",
      });
    });

    const orderPath = createdOrderPath;
    assert.ok(orderPath, "Created order path should be recorded");

    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, joiner);
      await installDeterministicShareSidecarStubs(page);
      await installFakeWeChatPayBridge(
        page,
        getScenarioEnvironment().fakeWeChatPay.origin,
      );

      await page.goto(orderPath);
      await page.getByTestId("order-detail.page").waitFor({
        state: "visible",
        timeout: 10_000,
      });
      await page.getByTestId("order-detail.bill-detail-link").click();
      await page.getByTestId("bill-detail.page").waitFor({
        state: "visible",
        timeout: 10_000,
      });
      await page.getByTestId("bill-detail.pay-line").click();
      await page.getByTestId("payment-checkout.page").waitFor({
        state: "visible",
        timeout: 10_000,
      });
      await assertLocatorTextMatches({
        actual: page.getByTestId("payment-checkout.amount").textContent(),
        pattern: /16\.00/,
        label: "Joiner bill line checkout amount",
      });
      await page.getByTestId("payment-checkout.create-charge").click();
      await page.getByTestId("payment-checkout.success").waitFor({
        state: "visible",
        timeout: 10_000,
      });
      await page.getByTestId("payment-checkout.bill-link").click();
      await page.getByTestId("bill-detail.page").waitFor({
        state: "visible",
        timeout: 10_000,
      });
      await waitForBillSettlementStatus(page, "已支付");
      await assertLocatorTextIncludes({
        actual: page.getByTestId("bill-detail.settlement-status").textContent(),
        expected: "已支付",
        label: "Bill status after both participant payments",
      });
      await page.getByTestId("bill-detail.order-link").click();
      await page.getByTestId("order-detail.page").waitFor({
        state: "visible",
        timeout: 10_000,
      });
      await waitForOrderDetailText({
        page,
        testId: "order-detail.payment-status",
        expected: "已支付",
      });
      await waitForOrderDetailText({
        page,
        testId: "order-detail.fulfillment-status",
        expected: "等待场地方确认预订",
      });
      await assertLocatorTextIncludes({
        actual: page.getByTestId("order-detail.payment-status").textContent(),
        expected: "已支付",
        label: "Order payment status after both BillLines paid",
      });
      await assertLocatorTextIncludes({
        actual: page.getByTestId("order-detail.fulfillment-status").textContent(),
        expected: "等待场地方确认预订",
        label: "Fulfillment status after bill settlement",
      });
    });

    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, creator);
      await installDeterministicShareSidecarStubs(page);

      await page.goto(orderPath);
      await page.getByTestId("order-detail.page").waitFor({
        state: "visible",
        timeout: 10_000,
      });
      await page.getByTestId("order-detail.mock-rental-confirm").click();
      await page.getByTestId("order-detail.rental.booking-confirmed").waitFor({
        state: "visible",
        timeout: 10_000,
      });
      await assertLocatorTextIncludes({
        actual: page.getByTestId("order-detail.rental.booking-confirmed").textContent(),
        expected: "预约成功",
        label: "Final fulfillment result",
      });
    });
  },
);

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
    await page.getByText("System commerce placement mismatch PR").waitFor({
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
    await page.getByText("订单创建需要 PR 处于 READY 状态").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    assert.equal(await page.getByTestId("ordering.rental.create-order").isDisabled(), true);
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
    await page.getByText("仅 PR 创建者可以创建订单").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    assert.equal(await page.getByTestId("ordering.rental.create-order").isDisabled(), true);
  });
});

scenario("commerce_rental_order_detail_cancels_unpaid_order", async (ctx) => {
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
      const price = document.querySelector(
        '[data-testid="ordering.rental.price"]',
      )?.textContent;
      return price?.includes("20.00");
    });
    await page.getByTestId("ordering.rental.create-order").click();

    await page.getByTestId("order-detail.page").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.getByTestId("order-detail.cancel-rental").click();
    await page.getByTestId("order-detail.rental.cancelled").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await assertLocatorTextIncludes({
      actual: page.getByTestId("order-detail.order-status").textContent(),
      expected: "已取消",
      label: "Cancelled order status",
    });
    await assertLocatorTextMatches({
      actual: page.getByTestId("order-detail.total-price").textContent(),
      pattern: /0\.00/,
      label: "Cancelled order effective bill total",
    });
    assert.equal(await page.getByTestId("order-detail.bill-line").count(), 4);
    await assertLocatorTextIncludes({
      actual: page.getByTestId("order-detail.rental.cancelled").textContent(),
      expected: "退款调整",
      label: "Cancellation refund adjustment copy",
    });
  });
});

scenario("commerce_rental_order_detail_refunds_paid_order", async (ctx) => {
  const creator = await givenUser("system-commerce-paid-cancel-creator");
  const joiner = await givenUser("system-commerce-paid-cancel-joiner");
  await bindScenarioWeChatOpenId({
    user: creator,
    openId: "fake-openid-commerce-paid-cancel-creator",
  });
  await bindScenarioWeChatOpenId({
    user: joiner,
    openId: "fake-openid-commerce-paid-cancel-joiner",
  });
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
    await installFakeWeChatPayBridge(
      page,
      getScenarioEnvironment().fakeWeChatPay.origin,
    );

    await page.goto(`/pr/${pr.id}`);
    await page.getByTestId("pr-detail.commerce-placement.open").click();
    await page.getByTestId("ordering.rental.page").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await fillRentalOrderingRequiredFields(page);
    await page.waitForFunction(() => {
      const price = document.querySelector(
        '[data-testid="ordering.rental.price"]',
      )?.textContent;
      return price?.includes("20.00");
    });
    await page.getByTestId("ordering.rental.create-order").click();
    await page.getByTestId("order-detail.page").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    orderPath = new URL(page.url()).pathname;

    await page.getByTestId("order-detail.bill-detail-link").click();
    await page.getByTestId("bill-detail.page").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await payFirstAvailableBillLine({
      page,
      amountPattern: /10\.00/,
      statusAfterReturn: "部分已支付",
      label: "Creator paid cancellation checkout amount",
    });
  });

  assert.ok(orderPath, "Paid cancellation order path should be recorded");

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, joiner);
    await installDeterministicShareSidecarStubs(page);
    await installFakeWeChatPayBridge(
      page,
      getScenarioEnvironment().fakeWeChatPay.origin,
    );

    await page.goto(orderPath);
    await page.getByTestId("order-detail.page").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.getByTestId("order-detail.bill-detail-link").click();
    await page.getByTestId("bill-detail.page").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await payFirstAvailableBillLine({
      page,
      amountPattern: /10\.00/,
      statusAfterReturn: "已支付",
      label: "Joiner paid cancellation checkout amount",
    });
  });

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, creator);
    await installDeterministicShareSidecarStubs(page);

    await page.goto(orderPath);
    await page.getByTestId("order-detail.page").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await waitForOrderDetailText({
      page,
      testId: "order-detail.fulfillment-status",
      expected: "等待场地方确认预订",
    });
    await page.getByTestId("order-detail.cancel-rental").click();
    await page.getByTestId("order-detail.rental.cancelled").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await assertLocatorTextIncludes({
      actual: page.getByTestId("order-detail.order-status").textContent(),
      expected: "已取消",
      label: "Paid cancellation order status",
    });
    await assertLocatorTextMatches({
      actual: page.getByTestId("order-detail.total-price").textContent(),
      pattern: /0\.00/,
      label: "Paid cancellation effective bill total",
    });

    await page.getByTestId("order-detail.bill-detail-link").click();
    await page.getByTestId("bill-detail.page").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.waitForFunction(() => {
      const text = document.querySelector(
        '[data-testid="bill-detail.refunded-total"]',
      )?.textContent;
      return text?.includes("20.00");
    });
    assert.equal(await page.getByTestId("bill-detail.line").count(), 4);
    await assertLocatorTextMatches({
      actual: page.getByTestId("bill-detail.refund-total").textContent(),
      pattern: /20\.00/,
      label: "Paid cancellation refund total",
    });
    await assertLocatorTextMatches({
      actual: page.getByTestId("bill-detail.refunded-total").textContent(),
      pattern: /20\.00/,
      label: "Paid cancellation refunded total",
    });
    await assertLocatorTextIncludes({
      actual: page.getByTestId("bill-detail.settlement-status").textContent(),
      expected: "已退款",
      label: "Paid cancellation settlement status",
    });

    const lineStatuses = await page
      .getByTestId("bill-detail.line-status")
      .allTextContents();
    assert.equal(
      lineStatuses.filter((status) => status.includes("已退款")).length,
      2,
      "Paid cancellation should refund both participant BillLines",
    );
  });
});
