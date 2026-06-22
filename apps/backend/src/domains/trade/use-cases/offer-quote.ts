import type { CommerceQuote, OfferQuoteId } from "../../../entities/commerce-quote";
import type { Offer, OfferId } from "../../../entities/offer";
import type { ProductSku } from "../../../entities/product-sku";
import type { ProductSpu } from "../../../entities/product-spu";
import { throwHttpProblem } from "../../../lib/problem-details";
import { CommerceQuoteRepository } from "../../../repositories/CommerceQuoteRepository";
import { OfferRepository } from "../../../repositories/OfferRepository";
import { ProductSkuRepository } from "../../../repositories/ProductSkuRepository";
import { ProductSpuRepository } from "../../../repositories/ProductSpuRepository";

const quoteRepo = new CommerceQuoteRepository();
const offerRepo = new OfferRepository();
const productSkuRepo = new ProductSkuRepository();
const productSpuRepo = new ProductSpuRepository();

export type FixedQuoteItemInput = {
  kind: "FIXED";
  quoteId: string;
  quantity?: number | null;
};

export type ChoiceSetQuoteItemInput = {
  kind: "CHOICE_SET";
  candidateQuoteIds: string[];
  quantity?: 1 | null;
};

export type QuoteBoundOrderItemInput = FixedQuoteItemInput | ChoiceSetQuoteItemInput;

export type ValidatedOfferQuote = {
  quote: CommerceQuote;
  offer: Offer;
  spu: ProductSpu;
  sku: ProductSku;
};

export type ValidatedQuoteItem =
  | {
      kind: "FIXED";
      quote: ValidatedOfferQuote;
    }
  | {
      kind: "CHOICE_SET";
      listingSessionId: string;
      candidateQuotes: ValidatedOfferQuote[];
    };

const isActiveNow = (offer: Offer, now = new Date()): boolean => {
  if (offer.status !== "ACTIVE") return false;
  if (offer.startsAt && offer.startsAt > now) return false;
  if (offer.endsAt && offer.endsAt <= now) return false;
  return true;
};

const quoteExpiredProblem = (): never =>
  throwHttpProblem({
    status: 409,
    detail: "报价已过期，请刷新后重新下单。",
    code: "ORDERING_QUOTE_EXPIRED",
    type: "https://partner-up.app/problems/commerce.quote-expired",
  });

async function validateQuote(quote: CommerceQuote, now: Date): Promise<ValidatedOfferQuote> {
  if (quote.expiresAt && quote.expiresAt <= now) {
    return quoteExpiredProblem();
  }
  const offer = await offerRepo.findById(quote.offerId);
  if (!offer || !isActiveNow(offer, now)) {
    return throwHttpProblem({
      status: 409,
      detail: "报价所属 Offer 当前不可下单。",
      code: "ORDERING_QUOTE_OFFER_INVALID",
    });
  }
  const sku = await productSkuRepo.findById(quote.skuId);
  if (!sku || sku.status !== "ACTIVE") {
    return throwHttpProblem({
      status: 409,
      detail: "报价所属 SKU 当前不可下单。",
      code: "ORDERING_QUOTE_SKU_INVALID",
    });
  }
  const spu = await productSpuRepo.findById(sku.spuId);
  if (!spu || spu.status !== "ACTIVE") {
    return throwHttpProblem({
      status: 409,
      detail: "报价所属 SPU 当前不可下单。",
      code: "ORDERING_QUOTE_SKU_INVALID",
    });
  }
  if (quote.productType !== offer.productType || spu.productType !== offer.productType) {
    return throwHttpProblem({
      status: 409,
      detail: "报价商品类型与 Offer 不一致。",
      code: "ORDERING_QUOTE_PRODUCT_TYPE_MISMATCH",
    });
  }
  if (!offer.spuIds.includes(spu.id)) {
    return throwHttpProblem({
      status: 409,
      detail: "报价商品不属于当前 Offer。",
      code: "ORDERING_QUOTE_MEMBERSHIP_INVALID",
    });
  }
  return {
    quote,
    offer,
    spu,
    sku,
  };
}

async function readValidatedQuotes(ids: string[]): Promise<ValidatedOfferQuote[]> {
  const uniqueIds = [...new Set(ids)].map((id) => id as OfferQuoteId);
  if (uniqueIds.length === 0) {
    return throwHttpProblem({
      status: 409,
      detail: "请选择至少一个报价。",
      code: "ORDERING_QUOTE_REQUIRED",
    });
  }
  const quotes = await quoteRepo.listByIds(uniqueIds);
  if (quotes.length !== uniqueIds.length) {
    return throwHttpProblem({
      status: 404,
      detail: "报价不存在或已不可用。",
      code: "ORDERING_QUOTE_NOT_FOUND",
    });
  }
  const byId = new Map(quotes.map((quote) => [quote.id, quote]));
  const now = new Date();
  return Promise.all(
    uniqueIds.map((id) => {
      const quote = byId.get(id);
      if (!quote) {
        return throwHttpProblem({
          status: 404,
          detail: "报价不存在或已不可用。",
          code: "ORDERING_QUOTE_NOT_FOUND",
        });
      }
      return validateQuote(quote, now);
    }),
  );
}

const assertSameListingContext = (quotes: ValidatedOfferQuote[]): string => {
  const listingSessionId = quotes[0]?.quote.listingSessionId;
  const offerId = quotes[0]?.quote.offerId;
  const productType = quotes[0]?.quote.productType;
  if (!listingSessionId) {
    return throwHttpProblem({
      status: 409,
      detail: "报价组合无效。",
      code: "ORDERING_QUOTE_GROUP_INVALID",
    });
  }
  if (quotes.some((quote) => quote.quote.listingSessionId !== listingSessionId)) {
    return throwHttpProblem({
      status: 409,
      detail: "请选择同一次报价中的车型。",
      code: "ORDERING_QUOTE_GROUP_INVALID",
    });
  }
  if (
    !offerId ||
    !productType ||
    quotes.some(
      (quote) =>
        quote.quote.offerId !== offerId ||
        quote.quote.productType !== productType ||
        quote.offer.id !== offerId ||
        quote.offer.productType !== productType,
    )
  ) {
    return throwHttpProblem({
      status: 409,
      detail: "请选择同一 Offer 的报价。",
      code: "ORDERING_QUOTE_GROUP_INVALID",
    });
  }
  return listingSessionId;
};

export async function resolveQuoteBoundOrderItems(
  items: QuoteBoundOrderItemInput[],
): Promise<ValidatedQuoteItem[]> {
  if (items.length === 0) {
    return throwHttpProblem({
      status: 400,
      detail: "CreateOrder requires at least one quote-bound item",
    });
  }
  return Promise.all(
    items.map(async (item) => {
      if (item.kind === "FIXED") {
        if ((item.quantity ?? 1) !== 1) {
          return throwHttpProblem({
            status: 409,
            detail: "Commerce MVP supports quantity 1 only",
          });
        }
        const [quote] = await readValidatedQuotes([item.quoteId]);
        if (!quote || quote.quote.itemKind !== "FIXED") {
          return throwHttpProblem({
            status: 409,
            detail: "报价不是固定商品报价。",
            code: "ORDERING_QUOTE_ITEM_KIND_MISMATCH",
          });
        }
        return {
          kind: "FIXED",
          quote,
        };
      }

      if ((item.quantity ?? 1) !== 1) {
        return throwHttpProblem({
          status: 409,
          detail: "Choice-set quantity must be 1",
        });
      }
      const candidateQuotes = await readValidatedQuotes(item.candidateQuoteIds);
      if (candidateQuotes.some((quote) => quote.quote.itemKind !== "CHOICE_CANDIDATE")) {
        return throwHttpProblem({
          status: 409,
          detail: "报价不是候选商品报价。",
          code: "ORDERING_QUOTE_ITEM_KIND_MISMATCH",
        });
      }
      const listingSessionId = assertSameListingContext(candidateQuotes);
      return {
        kind: "CHOICE_SET",
        listingSessionId,
        candidateQuotes,
      };
    }),
  );
}
