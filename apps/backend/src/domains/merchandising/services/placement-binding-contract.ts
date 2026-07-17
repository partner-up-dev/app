import type { Offer } from "../../../entities/offer";
import type { PlacementBindingContract } from "./placement-binding";

export function resolvePlacementBindingContractForOffer(
  offer: Pick<Offer, "productType">,
): PlacementBindingContract {
  if (offer.productType === "RENTAL") {
    return {
      requiredFieldKeys: ["participantCount", "serviceStartAt", "serviceEndAt"],
    };
  }

  return {
    requiredFieldKeys: [],
  };
}
