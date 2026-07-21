import type { ProductType } from "../model";
import type { PlacementBindingContract } from "./placement-binding";

export function resolvePlacementBindingContractForOffer(offer: {
  productType: ProductType;
}): PlacementBindingContract {
  if (offer.productType === "RENTAL") {
    return {
      requiredFieldKeys: ["participantCount", "serviceStartAt", "serviceEndAt"],
    };
  }

  return {
    requiredFieldKeys: [],
  };
}
