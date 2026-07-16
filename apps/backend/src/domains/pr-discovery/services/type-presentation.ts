import type { PRRoute } from "../../../entities/partner-request";
import { isPublishedPoi } from "../../../entities/poi";
import { PoiRepository } from "../../../repositories/PoiRepository";

const poiRepo = new PoiRepository();

const LOCATION_LOOKUP_PUNCTUATION_RE = /[\s\u3000\-_/.,，。、()（）[\]【】·•]/g;

const normalizeLocationLookupKey = (value: string): string =>
  value
    .trim()
    .toLocaleLowerCase("zh-CN")
    .replace(LOCATION_LOOKUP_PUNCTUATION_RE, "")
    .replace(/校区/g, "")
    .replace(/校园/g, "")
    .replace(/校/g, "");

type TypeConfigPresentationInput = {
  type: string;
  locationPool: string[];
  routePool: Array<{ id: string; route: PRRoute }>;
};

export type PRDiscoveryTypePlacePresentation = {
  locationCount: number;
  locationPool: string[];
  routeCount: number;
  routePool: Array<{ id: string; route: PRRoute }>;
  pois: Array<{ id: number; name: string; gallery: string[] }>;
  fallbackGallery: string[];
};

export const buildPRDiscoveryTypePlacePresentations = async (
  configs: readonly TypeConfigPresentationInput[],
): Promise<Map<string, PRDiscoveryTypePlacePresentation>> => {
  const locationLabels = Array.from(
    new Set(
      configs.flatMap((config) => config.locationPool.map((label) => label.trim())).filter(Boolean),
    ),
  );
  const exactPois = await poiRepo.findByNames(locationLabels, { includeUnpublished: true });
  const exactPoiByName = new Map(exactPois.map((poi) => [poi.name, poi]));
  const publishedExactPois = exactPois.filter(isPublishedPoi);
  const publishedExactPoiByName = new Map(publishedExactPois.map((poi) => [poi.name, poi]));
  const needNormalizedFallback = publishedExactPois.length < locationLabels.length;
  const publishedPoisByNormalizedName = new Map<
    string,
    Array<{ id: number; name: string; gallery: string[] }>
  >();
  if (needNormalizedFallback) {
    for (const poi of await poiRepo.listAll()) {
      if (!isPublishedPoi(poi)) continue;
      const key = normalizeLocationLookupKey(poi.name);
      if (!key) continue;
      const values = publishedPoisByNormalizedName.get(key) ?? [];
      values.push({ id: poi.id, name: poi.name, gallery: [...poi.gallery] });
      publishedPoisByNormalizedName.set(key, values);
    }
  }

  return new Map(
    configs.map((config) => {
      const locationPool = config.locationPool
        .map((label) => label.trim())
        .filter(
          (label) =>
            label && (!exactPoiByName.has(label) || isPublishedPoi(exactPoiByName.get(label)!)),
        );
      const matchedPois = new Map<number, { id: number; name: string; gallery: string[] }>();
      const fallbackGallery = new Set<string>();
      for (const label of locationPool) {
        const exactPoi = publishedExactPoiByName.get(label);
        const candidates = exactPoi
          ? [{ id: exactPoi.id, name: exactPoi.name, gallery: [...exactPoi.gallery] }]
          : (publishedPoisByNormalizedName.get(normalizeLocationLookupKey(label)) ?? []);
        for (const poi of candidates) {
          matchedPois.set(poi.id, poi);
          for (const image of poi.gallery) {
            const normalized = image.trim();
            if (normalized) fallbackGallery.add(normalized);
          }
        }
      }
      return [
        config.type,
        {
          locationCount: locationPool.length,
          locationPool,
          routeCount: config.routePool.length,
          routePool: config.routePool.map((entry) => ({ id: entry.id, route: entry.route })),
          pois: [...matchedPois.values()],
          fallbackGallery: [...fallbackGallery],
        },
      ];
    }),
  );
};
