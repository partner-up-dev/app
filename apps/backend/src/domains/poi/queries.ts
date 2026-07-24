import { PoiRepository } from "../../repositories/PoiRepository";
import type { AdminPoiSnapshot } from "./contracts";
import { toAdminPoiSnapshot } from "./services/admin-poi-projection";

/** Deliberate low-dependency public query surface for cross-domain POI reads. */
export {
  findPoiById,
  findPoiByName,
  findPoisByIds,
  findPoisByNames,
  resolvePublishedPoiByLocation,
  type PoiLookupOptions,
} from "./services/poi-lookup.service";

const poiRepo = new PoiRepository();

export const listAdminPois = async (): Promise<AdminPoiSnapshot[]> =>
  (await poiRepo.listAll()).map(toAdminPoiSnapshot);

export const findAdminPoisByIds = async (ids: number[]): Promise<AdminPoiSnapshot[]> =>
  (await poiRepo.findByIds(ids, { includeUnpublished: true })).map(toAdminPoiSnapshot);

export const findAdminPoisByNames = async (names: string[]): Promise<AdminPoiSnapshot[]> =>
  (await poiRepo.findByNames(names, { includeUnpublished: true })).map(toAdminPoiSnapshot);
