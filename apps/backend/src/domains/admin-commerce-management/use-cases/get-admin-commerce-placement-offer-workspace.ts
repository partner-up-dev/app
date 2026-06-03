import { OfferRepository } from "../../../repositories/OfferRepository";
import { PlacementRepository } from "../../../repositories/PlacementRepository";
import { ProductSpuRepository } from "../../../repositories/ProductSpuRepository";

const offerRepo = new OfferRepository();
const placementRepo = new PlacementRepository();
const productSpuRepo = new ProductSpuRepository();

export async function getAdminCommercePlacementOfferWorkspace() {
  const [spus, offers, placements] = await Promise.all([
    productSpuRepo.listAll(),
    offerRepo.listAll(),
    placementRepo.listAll(),
  ]);

  return {
    spus: spus.map((spu) => ({
      id: spu.id,
      name: spu.name,
      productType: spu.productType,
      status: spu.status,
    })),
    offers,
    placements,
  };
}
