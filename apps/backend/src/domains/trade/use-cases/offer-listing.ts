import { randomUUID } from "node:crypto";
import type {
  CommerceQuote,
  NewCommerceQuote,
  OfferListingSessionId,
  OfferQuoteFulfillmentSnapshot,
  OfferQuoteId,
  OfferQuoteListingContextSnapshot,
  OfferQuotePriceSnapshot,
  RentalQuoteListingContextSnapshot,
  RideHailingQuoteListingContextSnapshot,
} from "../../../entities/commerce-quote";
import type { Offer, OfferId } from "../../../entities/offer";
import type { ProductSku } from "../../../entities/product-sku";
import type { ProductSpu } from "../../../entities/product-spu";
import type { RideHailingProviderInstanceId } from "../../../entities/ride-hailing-provider";
import { throwHttpProblem } from "../../../lib/problem-details";
import { throwRentalRuntimeRetired } from "../../../lib/rental-runtime-retirement";
import { CommerceQuoteRepository } from "../../../repositories/CommerceQuoteRepository";
import { OfferRepository } from "../../../repositories/OfferRepository";
import { ProductSkuRepository } from "../../../repositories/ProductSkuRepository";
import { ProductSpuRepository } from "../../../repositories/ProductSpuRepository";
import { RideHailingProviderInstanceRepository } from "../../../repositories/RideHailingProviderInstanceRepository";
import { SkuCancellationPolicyRepository } from "../../../repositories/SkuCancellationPolicyRepository";
import type {
  FixedTotalPricingModel,
  PriceExplanation,
  RentalSkuFacts,
  RideHailingSkuFacts,
} from "../../merchandising/contracts";
import { isRentalSkuFacts, isRideHailingSkuFacts } from "../../merchandising/contracts";
import type { RideHailingProviderVehicleQuote } from "../../ride-hailing/contracts";
import { createRideHailingDispatchPort } from "../../ride-hailing/ports";
import type {
  OrderParticipantSnapshot,
  RentalRegistrant,
  RideHailingRiderSnapshot,
  RideHailingRouteSnapshot,
} from "../model";
import { buildOrderParticipantsFromContext, PricingApplication } from "../services";

const offerRepo = new OfferRepository();
const productSpuRepo = new ProductSpuRepository();
const productSkuRepo = new ProductSkuRepository();
const providerRepo = new RideHailingProviderInstanceRepository();
const quoteRepo = new CommerceQuoteRepository();
const skuCancellationPolicyRepo = new SkuCancellationPolicyRepository();
const pricingApplication = new PricingApplication();

const RIDE_QUOTE_TTL_MS = 2 * 60 * 1000;

const writeRideHailingListingDiagnostic = (payload: Record<string, unknown>): void => {
  process.stdout.write(
    `${JSON.stringify({
      marker: "RideHailingListingDiagnostic",
      ...payload,
    })}\n`,
  );
};

const summarizeRideHailingRoute = (route: RideHailingRouteSnapshot) => ({
  destination: {
    latitude: route.destination.latitude,
    longitude: route.destination.longitude,
    name: route.destination.name,
  },
  origin: {
    latitude: route.origin.latitude,
    longitude: route.origin.longitude,
    name: route.origin.name,
  },
  waypointCount: route.waypoints.length,
});

const serializeDiagnosticError = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack?.split("\n").slice(0, 6).join("\n") ?? null,
    };
  }
  return {
    message: String(error),
    name: typeof error,
    stack: null,
  };
};

export type OfferListingParticipantInput = {
  userId: string;
  displayName?: string | null;
  phoneMasked?: string | null;
};

export type OfferListingInput =
  | {
      productType: "RENTAL";
      participants: OfferListingParticipantInput[];
      serviceStartAt: string;
      serviceEndAt: string;
      contactPhone: string;
      registrants: Array<{
        fullName: string;
        nationalId?: string | null;
      }>;
    }
  | {
      productType: "RIDE_HAILING";
      participants: OfferListingParticipantInput[];
      route: RideHailingRouteSnapshot;
      departureAt?: string | null;
      riders: OfferListingParticipantInput[];
      contactPhone: string;
    };

export type ListingPriceSnapshot = OfferQuotePriceSnapshot;

export type OfferListedItem =
  | {
      kind: "FIXED";
      productType: "RENTAL";
      skuId: number;
      spuId: number;
      quoteId: string;
      displayName: string;
      presentation: ProductSku["presentation"];
      price: ListingPriceSnapshot;
      cancellationPolicySummary: Array<{
        visibleLabel: string;
        refundPercent: number;
        requiresOperatorHandling: boolean;
      }>;
    }
  | {
      kind: "CHOICE_CANDIDATE";
      productType: "RIDE_HAILING";
      skuId: number;
      spuId: number;
      quoteId: string;
      displayName: string;
      providerName: string;
      providerVehicleTypeCode: string;
      providerVehicleTypeName: string;
      presentation: ProductSku["presentation"];
      estimateSnapshot: RideHailingProviderVehicleQuote;
      price: ListingPriceSnapshot;
    };

export type OfferListingResult = {
  offerId: number;
  productType: Offer["productType"];
  listingSessionId: string;
  expiresAt: string | null;
  items: OfferListedItem[];
};

type ActiveSkuContext = {
  offer: Offer;
  spu: ProductSpu;
  sku: ProductSku;
};

type RentalSkuContext = ActiveSkuContext & {
  sku: ProductSku & { facts: RentalSkuFacts; pricingModel: FixedTotalPricingModel };
};

type RideSkuContext = ActiveSkuContext & {
  sku: ProductSku & { facts: RideHailingSkuFacts };
};

const isActiveNow = (offer: Offer, now = new Date()): boolean => {
  if (offer.status !== "ACTIVE") return false;
  if (offer.startsAt && offer.startsAt > now) return false;
  if (offer.endsAt && offer.endsAt <= now) return false;
  return true;
};

async function resolveOffer(offerId: number): Promise<Offer> {
  const offer = await offerRepo.findById(offerId as OfferId);
  if (!offer) {
    return throwHttpProblem({ status: 404, detail: "Offer not found" });
  }
  if (!isActiveNow(offer)) {
    return throwHttpProblem({ status: 409, detail: "Offer is not active" });
  }
  return offer;
}

async function listActiveSkuContexts(offer: Offer): Promise<ActiveSkuContext[]> {
  const contexts: ActiveSkuContext[] = [];
  for (const spuId of offer.spuIds) {
    const spu = await productSpuRepo.findById(spuId);
    if (!spu || spu.status !== "ACTIVE" || spu.productType !== offer.productType) {
      continue;
    }
    const skus = await productSkuRepo.listBySpuId(spu.id);
    for (const sku of skus) {
      if (sku.status !== "ACTIVE") continue;
      contexts.push({ offer, spu, sku });
    }
  }
  return contexts;
}

const buildParticipants = (input: {
  participants: OfferListingParticipantInput[];
  createdBy: string;
}): OrderParticipantSnapshot[] => {
  if (input.participants.length === 0) {
    return throwHttpProblem({
      status: 409,
      detail: "订单至少需要一名参与者。",
      code: "ORDER_PARTICIPANTS_REQUIRED",
    });
  }
  return buildOrderParticipantsFromContext({
    participants: input.participants.map((participant) => ({
      participantId: participant.userId,
      userId: participant.userId,
      joinedVia: "API",
    })),
    createdBy: input.createdBy,
  });
};

const buildRiderSnapshots = (riders: OfferListingParticipantInput[]): RideHailingRiderSnapshot[] =>
  riders.map((rider) => ({
    userId: rider.userId,
    displayName: rider.displayName?.trim() || "同乘人",
    phoneMasked: rider.phoneMasked ?? null,
  }));

const buildRentalRegistrants = (input: {
  registrants: Array<{ fullName: string; nationalId?: string | null }>;
  contactPhone: string;
}): RentalRegistrant[] =>
  input.registrants.map((registrant) => ({
    name: registrant.fullName.trim(),
    phone: input.contactPhone,
    nationalIdMasked: registrant.nationalId ? "已填写" : null,
  }));

const assertRentalListingInput = (input: Extract<OfferListingInput, { productType: "RENTAL" }>) => {
  if (!input.contactPhone.trim()) {
    return throwHttpProblem({
      status: 409,
      detail: "请填写联系人电话。",
      code: "ORDER_CONTACT_PHONE_REQUIRED",
    });
  }
  if (input.registrants.length !== input.participants.length) {
    return throwHttpProblem({
      status: 409,
      detail: "实名登记人数需要匹配订单参与者人数。",
      code: "RENTAL_REGISTRANT_COUNT_MISMATCH",
    });
  }
  if (input.registrants.some((registrant) => registrant.fullName.trim().length === 0)) {
    return throwHttpProblem({
      status: 409,
      detail: "请填写所有入场人的姓名。",
      code: "RENTAL_REGISTRANT_NAME_REQUIRED",
    });
  }
};

const assertRideListingInput = (
  input: Extract<OfferListingInput, { productType: "RIDE_HAILING" }>,
) => {
  if (!input.contactPhone.trim()) {
    return throwHttpProblem({
      status: 409,
      detail: "请填写联系方式。",
      code: "ORDER_CONTACT_PHONE_REQUIRED",
    });
  }
  if (input.riders.length === 0) {
    return throwHttpProblem({
      status: 409,
      detail: "至少需要一名同乘人。",
      code: "RIDE_HAILING_RIDERS_REQUIRED",
    });
  }
};

const pricingToListingPrice = (input: {
  explanations: PriceExplanation[];
  totalFen: number | null;
}): ListingPriceSnapshot => ({
  currency: "CNY",
  totalFen: input.totalFen,
  range: null,
  explanations: input.explanations,
});

async function buildCancellationPolicySummary(sku: ProductSku) {
  const ref = sku.cancellationPolicyRef;
  const policy = ref
    ? await skuCancellationPolicyRepo.findByRef(ref.policyId, ref.policyVersion)
    : await skuCancellationPolicyRepo.findLatestBySkuId(sku.id);

  return (
    policy?.tiers.map((tier) => ({
      visibleLabel: tier.visibleLabel,
      refundPercent: tier.refundPercent,
      requiresOperatorHandling: tier.requiresOperatorHandling,
    })) ?? []
  );
}

async function listRentalItems(input: {
  offer: Offer;
  listingSessionId: OfferListingSessionId;
  listingContext: RentalQuoteListingContextSnapshot;
}): Promise<{ items: OfferListedItem[]; quotes: NewCommerceQuote[] }> {
  const contexts = (await listActiveSkuContexts(input.offer)).flatMap(
    (context): RentalSkuContext[] => {
      if (!isRentalSkuFacts(context.sku.facts) || context.sku.pricingModel.type !== "FIXED_TOTAL") {
        return [];
      }
      if (context.sku.facts.participantCount !== input.listingContext.participants.length) {
        return [];
      }
      return [
        {
          ...context,
          sku: {
            ...context.sku,
            facts: context.sku.facts,
            pricingModel: context.sku.pricingModel,
          },
        },
      ];
    },
  );
  const rows = await Promise.all(
    contexts.map(async (context) => {
      const quoteId = randomUUID() as OfferQuoteId;
      const pricingSnapshot = pricingApplication.resolve({
        offer: input.offer,
        items: [
          {
            itemId: quoteId,
            spu: context.spu,
            sku: context.sku,
            quantity: 1,
          },
        ],
        orderContext: {
          serviceTime: input.listingContext.serviceStartAt,
        },
      });
      const price = pricingToListingPrice({
        totalFen: pricingSnapshot.totalFen,
        explanations: [
          ...pricingSnapshot.itemBreakdowns.flatMap((breakdown) => breakdown.explanations),
          ...pricingSnapshot.orderLevelExplanations,
        ],
      });
      const fulfillmentQuoteSnapshot: OfferQuoteFulfillmentSnapshot = {
        productType: "RENTAL",
      };
      return {
        item: {
          kind: "FIXED",
          productType: "RENTAL",
          skuId: context.sku.id,
          spuId: context.spu.id,
          quoteId,
          displayName: context.sku.name,
          presentation: context.sku.presentation,
          price,
          cancellationPolicySummary: await buildCancellationPolicySummary(context.sku),
        } satisfies OfferListedItem,
        quote: {
          id: quoteId,
          listingSessionId: input.listingSessionId,
          offerId: input.offer.id as OfferId,
          productType: "RENTAL",
          itemKind: "FIXED",
          spuId: context.spu.id,
          skuId: context.sku.id,
          quantity: 1,
          listingContextSnapshot: input.listingContext,
          fulfillmentQuoteSnapshot,
          pricingSnapshot: price,
          expiresAt: null,
        } satisfies NewCommerceQuote,
      };
    }),
  );
  return {
    items: rows.map((row) => row.item),
    quotes: rows.map((row) => row.quote),
  };
}

async function quoteRideSku(input: {
  offer: Offer;
  context: RideSkuContext;
  listingSessionId: OfferListingSessionId;
  route: RideHailingRouteSnapshot;
  departureAt: string | null;
}): Promise<{
  providerName: string;
  providerQuote: RideHailingProviderVehicleQuote;
  price: ListingPriceSnapshot;
} | null> {
  const provider = await providerRepo.findById(
    input.context.sku.facts.rideHailingProviderInstanceId as RideHailingProviderInstanceId,
  );
  if (!provider || provider.status !== "ACTIVE") {
    writeRideHailingListingDiagnostic({
      event: "ride_provider_unavailable",
      listingSessionId: input.listingSessionId,
      offerId: input.offer.id,
      providerFound: provider !== null,
      providerInstanceId: input.context.sku.facts.rideHailingProviderInstanceId,
      providerStatus: provider?.status ?? null,
      providerVehicleTypeCode: input.context.sku.facts.providerVehicleTypeCode,
      skuId: input.context.sku.id,
      spuId: input.context.spu.id,
    });
    return null;
  }

  const port = createRideHailingDispatchPort({ providerInstance: provider });
  writeRideHailingListingDiagnostic({
    event: "ride_provider_estimate_start",
    listingSessionId: input.listingSessionId,
    offerId: input.offer.id,
    providerInstanceId: provider.id,
    providerStatus: provider.status,
    providerType: provider.providerType,
    providerVehicleTypeCode: input.context.sku.facts.providerVehicleTypeCode,
    route: summarizeRideHailingRoute(input.route),
    skuId: input.context.sku.id,
    spuId: input.context.spu.id,
  });
  const providerQuote = await port.estimate({
    params: {
      car_type: input.context.sku.facts.providerVehicleTypeCode,
      from_latitude: input.route.origin.latitude,
      from_longitude: input.route.origin.longitude,
      departure_at: input.departureAt,
      to_latitude: input.route.destination.latitude,
      to_longitude: input.route.destination.longitude,
    },
  });
  const pricingSnapshot = pricingApplication.resolve({
    offer: input.offer,
    items: [
      {
        itemId: "listing-preview",
        spu: input.context.spu,
        sku: input.context.sku,
        quantity: 1,
      },
    ],
    orderContext: {
      serviceTime: input.departureAt,
      quoteTotalFen: providerQuote.estimateAmountFen,
    },
  });
  return {
    providerName: provider.displayName,
    providerQuote,
    price: pricingToListingPrice({
      totalFen: pricingSnapshot.totalFen,
      explanations: [
        ...pricingSnapshot.itemBreakdowns.flatMap((breakdown) => breakdown.explanations),
        ...pricingSnapshot.orderLevelExplanations,
      ],
    }),
  };
}

async function listRideItems(input: {
  offer: Offer;
  listingSessionId: OfferListingSessionId;
  listingContext: RideHailingQuoteListingContextSnapshot;
}): Promise<{ items: OfferListedItem[]; quotes: NewCommerceQuote[]; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + RIDE_QUOTE_TTL_MS);
  const contexts = (await listActiveSkuContexts(input.offer)).flatMap(
    (context): RideSkuContext[] =>
      isRideHailingSkuFacts(context.sku.facts)
        ? [
            {
              ...context,
              sku: {
                ...context.sku,
                facts: context.sku.facts,
              },
            },
          ]
        : [],
  );
  writeRideHailingListingDiagnostic({
    event: "ride_listing_contexts_resolved",
    contextCount: contexts.length,
    listingSessionId: input.listingSessionId,
    offerId: input.offer.id,
    route: summarizeRideHailingRoute(input.listingContext.route),
    skus: contexts.map((context) => ({
      providerInstanceId: context.sku.facts.rideHailingProviderInstanceId,
      providerVehicleTypeCode: context.sku.facts.providerVehicleTypeCode,
      skuId: context.sku.id,
      spuId: context.spu.id,
    })),
  });
  const rows = (
    await Promise.all(
      contexts.map(async (context) => {
        let quoted: Awaited<ReturnType<typeof quoteRideSku>>;
        try {
          quoted = await quoteRideSku({
            offer: input.offer,
            context,
            listingSessionId: input.listingSessionId,
            route: input.listingContext.route,
            departureAt: input.listingContext.departureAt,
          });
        } catch (error) {
          writeRideHailingListingDiagnostic({
            event: "ride_listing_candidate_failed",
            error: serializeDiagnosticError(error),
            listingSessionId: input.listingSessionId,
            offerId: input.offer.id,
            providerInstanceId: context.sku.facts.rideHailingProviderInstanceId,
            providerVehicleTypeCode: context.sku.facts.providerVehicleTypeCode,
            skuId: context.sku.id,
            spuId: context.spu.id,
          });
          quoted = null;
        }
        if (!quoted) return null;
        const quoteId = randomUUID() as OfferQuoteId;
        const displayName = `${quoted.providerName}${quoted.providerQuote.providerVehicleTypeName}`;
        const fulfillmentQuoteSnapshot: OfferQuoteFulfillmentSnapshot = {
          productType: "RIDE_HAILING",
          providerInstanceId: context.sku.facts.rideHailingProviderInstanceId,
          providerName: quoted.providerName,
          providerVehicleTypeCode: context.sku.facts.providerVehicleTypeCode,
          providerVehicleTypeName: quoted.providerQuote.providerVehicleTypeName,
          providerQuoteId: quoted.providerQuote.providerQuoteId,
          providerQuoteExpiresAt: quoted.providerQuote.providerQuoteExpiresAt,
          providerSnapshot: quoted.providerQuote.providerSnapshot,
          estimateAmountFen: quoted.providerQuote.estimateAmountFen,
          distanceMeters: quoted.providerQuote.distanceMeters,
          durationSeconds: quoted.providerQuote.durationSeconds,
          displayName,
        };
        return {
          item: {
            kind: "CHOICE_CANDIDATE",
            productType: "RIDE_HAILING",
            skuId: context.sku.id,
            spuId: context.spu.id,
            quoteId,
            displayName,
            providerName: quoted.providerName,
            providerVehicleTypeCode: context.sku.facts.providerVehicleTypeCode,
            providerVehicleTypeName: quoted.providerQuote.providerVehicleTypeName,
            presentation: context.sku.presentation,
            estimateSnapshot: quoted.providerQuote,
            price: quoted.price,
          } satisfies OfferListedItem,
          quote: {
            id: quoteId,
            listingSessionId: input.listingSessionId,
            offerId: input.offer.id as OfferId,
            productType: "RIDE_HAILING",
            itemKind: "CHOICE_CANDIDATE",
            spuId: context.spu.id,
            skuId: context.sku.id,
            quantity: 1,
            listingContextSnapshot: input.listingContext,
            fulfillmentQuoteSnapshot,
            pricingSnapshot: quoted.price,
            expiresAt,
          } satisfies NewCommerceQuote,
        };
      }),
    )
  ).filter((row): row is NonNullable<typeof row> => row !== null);

  return {
    expiresAt,
    items: rows.map((row) => row.item),
    quotes: rows.map((row) => row.quote),
  };
}

export async function listOfferListing(input: {
  offerId: number;
  viewerUserId: string;
  listingInput: OfferListingInput;
}): Promise<OfferListingResult> {
  const offer = await resolveOffer(input.offerId);
  if (offer.productType !== input.listingInput.productType) {
    return throwHttpProblem({
      status: 409,
      detail: "Offer product type does not match listing input",
    });
  }

  if (offer.productType === "RENTAL") {
    return throwRentalRuntimeRetired();
  }

  const listingSessionId = randomUUID() as OfferListingSessionId;
  const participants = buildParticipants({
    participants: input.listingInput.participants,
    createdBy: input.viewerUserId,
  });

  if (input.listingInput.productType === "RENTAL") {
    assertRentalListingInput(input.listingInput);
    const listingContext: OfferQuoteListingContextSnapshot = {
      productType: "RENTAL",
      participants,
      serviceStartAt: input.listingInput.serviceStartAt,
      serviceEndAt: input.listingInput.serviceEndAt,
      contactPhone: input.listingInput.contactPhone.trim(),
      registrants: buildRentalRegistrants({
        contactPhone: input.listingInput.contactPhone.trim(),
        registrants: input.listingInput.registrants,
      }),
    };
    const listed = await listRentalItems({
      offer,
      listingSessionId,
      listingContext,
    });
    const quotes = await quoteRepo.createMany(listed.quotes);
    const quoteIds = new Set(quotes.map((quote) => quote.id));
    return {
      offerId: offer.id,
      productType: offer.productType,
      listingSessionId,
      expiresAt: null,
      items: listed.items.filter((item) => quoteIds.has(item.quoteId as OfferQuoteId)),
    };
  }

  assertRideListingInput(input.listingInput);
  const listingContext: OfferQuoteListingContextSnapshot = {
    productType: "RIDE_HAILING",
    participants,
    route: input.listingInput.route,
    departureAt: input.listingInput.departureAt ?? null,
    riders: buildRiderSnapshots(input.listingInput.riders),
    contactPhone: input.listingInput.contactPhone.trim(),
  };
  const listed = await listRideItems({
    offer,
    listingSessionId,
    listingContext,
  });
  const quotes = await quoteRepo.createMany(listed.quotes);
  const quoteIds = new Set(quotes.map((quote) => quote.id));
  return {
    offerId: offer.id,
    productType: offer.productType,
    listingSessionId,
    expiresAt: listed.expiresAt.toISOString(),
    items: listed.items.filter((item) => quoteIds.has(item.quoteId as OfferQuoteId)),
  };
}

export type PersistedOfferQuote = CommerceQuote;
