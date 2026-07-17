/** Deliberate low-dependency public query surface for cross-domain POI reads. */
export {
  findPoiById,
  findPoiByName,
  findPoisByIds,
  findPoisByNames,
  resolvePublishedPoiByLocation,
  type PoiLookupOptions,
} from "./services/poi-lookup.service";
