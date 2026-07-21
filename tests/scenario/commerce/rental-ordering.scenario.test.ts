import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  createOffer,
  createPlacement,
  createProductSpu,
} from "../../../apps/backend/src/domains/merchandising/commands";
import { PartnerRepository } from "../../../apps/backend/src/repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../apps/backend/src/repositories/PartnerRequestRepository";
import { givenUser } from "../../../apps/backend/tests/pr/_kit/builders/users";
import { withScenarioPage } from "../_infra/browser/browser";
import { installScenarioUserSession } from "../_infra/browser/session";
import { installDeterministicShareSidecarStubs } from "../_infra/browser/share-sidecars";
import { scenario } from "../_infra/scenario/scenario";

const partnerRepo = new PartnerRepository();
const partnerRequestRepo = new PartnerRequestRepository();

scenario("commerce_retired_rental_placement_is_absent_from_pr_ordering", async (ctx) => {
  const creator = await givenUser(`retired-rental-placement-${randomUUID()}`);
  const title = `Retired Rental PR ${randomUUID()}`;
  const pr = await partnerRequestRepo.create({
    budget: null,
    createdBy: creator.user.id,
    joinGateConfig: [],
    location: "Scenario Court",
    maxPartners: null,
    meetingPoint: null,
    minPartners: 1,
    notes: null,
    preferences: [],
    status: "READY",
    time: ["2031-01-01T10:00:00.000Z", "2031-01-01T12:00:00.000Z"],
    title,
    type: "badminton",
  });
  await partnerRepo.createSlot({
    prId: pr.id,
    status: "JOINED",
    userId: creator.user.id,
  });

  const spu = await createProductSpu({
    name: "Retired Rental placement fixture",
    productType: "RENTAL",
    status: "ACTIVE",
    salesPolicy: {
      skuSelectionPolicy: { type: "EXACTLY_ONE" },
      quantityPolicy: { type: "FIXED", quantity: 1 },
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
  const offer = await createOffer({
    productType: "RENTAL",
    spuIds: [spu.id],
    status: "ACTIVE",
    pricingRules: [],
    termsVersion: 1,
  });
  const placement = await createPlacement({
    placementType: "BUTTON",
    offerId: offer.id,
    status: "ACTIVE",
    matchingRule: { "===": [{ var: "kind" }, "PR"] },
    priority: 100,
    creative: {
      ctaLabel: "预订已退役场地",
      description: "This fixture must be filtered by the Rental retirement boundary",
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

  ctx.record("prId", pr.id);
  ctx.record("placementId", placement.id);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, creator);
    await installDeterministicShareSidecarStubs(page);
    await page.goto(`/pr/${pr.id}`);
    await page.getByRole("heading", { name: title }).waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.waitForLoadState("networkidle");

    assert.equal(
      await page.getByTestId("pr-detail.commerce-placement.open").count(),
      0,
      "An active Rental Placement must not remain an executable PR ordering entry",
    );
    assert.equal(
      await page.getByText("预订已退役场地").count(),
      0,
      "Retired Rental creative must not leak into the PR action surface",
    );
  });
});
