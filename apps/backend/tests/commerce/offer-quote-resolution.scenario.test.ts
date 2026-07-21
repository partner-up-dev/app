import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  createOffer,
  createProductSku,
  createProductSpu,
} from "../../src/domains/merchandising/commands";
import {
  createEmptyProductPresentation,
  type PricingModel,
} from "../../src/domains/merchandising/model";
import { resolveQuoteBoundOrderItems } from "../../src/domains/trade/use-cases/offer-quote";
import {
  type CommerceQuote,
  type OfferListingSessionId,
  type OfferQuoteId,
} from "../../src/entities/commerce-quote";
import type { Offer } from "../../src/entities/offer";
import type { ProductSku } from "../../src/entities/product-sku";
import type { ProductSpu } from "../../src/entities/product-spu";
import { ProblemDetailsError } from "../../src/lib/problem-details";
import { CommerceQuoteRepository } from "../../src/repositories/CommerceQuoteRepository";
import { OfferRepository } from "../../src/repositories/OfferRepository";
import { ProductSkuRepository } from "../../src/repositories/ProductSkuRepository";
import { scenario } from "../_infra/scenario/scenario";

const quoteRepo = new CommerceQuoteRepository();
const offerRepo = new OfferRepository();
const productSkuRepo = new ProductSkuRepository();

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

async function givenRideQuoteCatalog(input: {
  skuName?: string;
  providerVehicleTypeCode?: string;
}): Promise<{
  offer: Offer;
  sku: ProductSku;
  spu: ProductSpu;
}> {
  const spu = await createProductSpu({
    name: `Quote resolver ride SPU ${randomUUID()}`,
    productType: "RIDE_HAILING",
    presentation: createEmptyProductPresentation(),
    salesPolicy: {
      quantityPolicy: {
        quantity: 1,
        type: "FIXED",
      },
      skuSelectionPolicy: {
        max: null,
        min: 1,
        resolvesTo: 1,
        type: "CHOICE_SET",
      },
    },
    servicePolicy: {
      type: "RIDE_HAILING",
    },
    status: "ACTIVE",
  });
  const sku = await createProductSku({
    facts: {
      providerVehicleTypeCode: input.providerVehicleTypeCode ?? "3",
      rideHailingProviderInstanceId: randomUUID(),
    },
    name: input.skuName ?? "Quote resolver ride SKU",
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
  return { offer, sku, spu };
}

async function createRideCandidateQuote(input: {
  offer: Offer;
  sku: ProductSku;
  spu: ProductSpu;
  listingSessionId?: OfferListingSessionId;
  quoteId?: OfferQuoteId;
}): Promise<CommerceQuote> {
  const quoteId = input.quoteId ?? (randomUUID() as OfferQuoteId);
  const listingSessionId = input.listingSessionId ?? (randomUUID() as OfferListingSessionId);
  const participantUserId = randomUUID();
  return quoteRepo.create({
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    fulfillmentQuoteSnapshot: {
      displayName: `系统曹操${input.sku.name}`,
      distanceMeters: 8200,
      durationSeconds: 1500,
      estimateAmountFen: 3600,
      productType: "RIDE_HAILING",
      providerInstanceId: randomUUID(),
      providerName: "系统曹操",
      providerQuoteExpiresAt: null,
      providerQuoteId: `fake_quote_${input.sku.id}`,
      providerSnapshot: {},
      providerVehicleTypeCode: "3",
      providerVehicleTypeName: input.sku.name,
    },
    id: quoteId,
    itemKind: "CHOICE_CANDIDATE",
    listingContextSnapshot: {
      contactPhone: "13800138000",
      departureAt: null,
      participants: [
        {
          displayName: "Quote User",
          phoneMasked: null,
          userId: participantUserId,
        },
      ],
      productType: "RIDE_HAILING",
      riders: [
        {
          displayName: "Quote User",
          phoneMasked: null,
          userId: participantUserId,
        },
      ],
      route: {
        destination: {
          address: "杭州市西湖区灵隐路1号",
          latitude: 30.24,
          longitude: 120.102,
          name: "灵隐寺",
        },
        drivingPlan: null,
        origin: {
          address: "杭州市上城区全福桥路2号",
          latitude: 30.2912,
          longitude: 120.212,
          name: "杭州东站",
        },
        waypoints: [],
      },
    },
    listingSessionId,
    offerId: input.offer.id,
    pricingSnapshot: {
      currency: "CNY",
      explanations: [],
      totalFen: 3600,
    },
    productType: "RIDE_HAILING",
    quantity: 1,
    skuId: input.sku.id,
    spuId: input.spu.id,
  });
}

async function assertProblemCode(run: () => Promise<unknown>, expectedCode: string): Promise<void> {
  let thrown: unknown = null;
  try {
    await run();
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof ProblemDetailsError);
  assert.equal(thrown.code, expectedCode);
}

scenario("commerce_quote_validity_rejects_inactive_offer_and_sku", async () => {
  const inactiveOfferCatalog = await givenRideQuoteCatalog({
    skuName: "快车",
    providerVehicleTypeCode: "3",
  });
  const inactiveOfferQuote = await createRideCandidateQuote(inactiveOfferCatalog);
  await offerRepo.updateById(inactiveOfferCatalog.offer.id, {
    status: "PAUSED",
  });

  await assertProblemCode(
    () =>
      resolveQuoteBoundOrderItems([
        {
          candidateQuoteIds: [inactiveOfferQuote.id],
          kind: "CHOICE_SET",
        },
      ]),
    "ORDERING_QUOTE_OFFER_INVALID",
  );

  const inactiveSkuCatalog = await givenRideQuoteCatalog({
    skuName: "专车",
    providerVehicleTypeCode: "5",
  });
  const inactiveSkuQuote = await createRideCandidateQuote(inactiveSkuCatalog);
  await productSkuRepo.updateById(inactiveSkuCatalog.sku.id, {
    status: "ARCHIVED",
  });

  await assertProblemCode(
    () =>
      resolveQuoteBoundOrderItems([
        {
          candidateQuoteIds: [inactiveSkuQuote.id],
          kind: "CHOICE_SET",
        },
      ]),
    "ORDERING_QUOTE_SKU_INVALID",
  );
});

scenario("commerce_choice_set_quotes_must_share_one_listing_session", async () => {
  const expressCatalog = await givenRideQuoteCatalog({
    skuName: "快车",
    providerVehicleTypeCode: "3",
  });
  const premierSku = await createProductSku({
    facts: {
      providerVehicleTypeCode: "5",
      rideHailingProviderInstanceId: randomUUID(),
    },
    name: "专车",
    pricingModel: providerEstimatePricingModel,
    sortOrder: 20,
    spuId: expressCatalog.spu.id,
    status: "ACTIVE",
  });
  const expressQuote = await createRideCandidateQuote({
    ...expressCatalog,
    listingSessionId: randomUUID() as OfferListingSessionId,
  });
  const premierQuote = await createRideCandidateQuote({
    offer: expressCatalog.offer,
    sku: premierSku,
    spu: expressCatalog.spu,
    listingSessionId: randomUUID() as OfferListingSessionId,
  });

  await assertProblemCode(
    () =>
      resolveQuoteBoundOrderItems([
        {
          candidateQuoteIds: [expressQuote.id, premierQuote.id],
          kind: "CHOICE_SET",
        },
      ]),
    "ORDERING_QUOTE_GROUP_INVALID",
  );
});
