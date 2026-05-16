/**
 * Use-case: List all active Anchor Events for the Event Plaza.
 */

import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import {
  type AnchorEventRoutePool,
  type AnchorEventPrCreationPolicy,
  type AnchorEvent,
  normalizeAnchorEventRoutePool,
  normalizeLocationPool,
} from "../../../entities/anchor-event";
import { isPublishedPoi } from "../../../entities/poi";
import { PoiRepository } from "../../../repositories/PoiRepository";
import { canUserCreatePRForAnchorEvent } from "../../pr/services";
import { findPoisByNames } from "../../poi";

const repo = new AnchorEventRepository();
const poiRepo = new PoiRepository();

export interface AnchorEventSummary {
  id: number;
  title: string;
  type: string;
  description: string | null;
  coverImage: string | null;
  betaGroupQrCode: string | null;
  locationCount: number;
  locationPool: string[];
  routeCount: number;
  routePool: AnchorEventRoutePool;
  pois: Array<{
    id: number;
    name: string;
    gallery: string[];
  }>;
  fallbackGallery: string[];
  prCreationPolicy: AnchorEventPrCreationPolicy;
  canUserCreatePR: boolean;
  status: string;
  createdAt: string;
}

const LOCATION_LOOKUP_PUNCTUATION_RE = /[\s\u3000\-_/.,，。、()（）[\]【】·•]/g;

function normalizeLocationLookupKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(LOCATION_LOOKUP_PUNCTUATION_RE, "")
    .replace(/校区/g, "")
    .replace(/校园/g, "")
    .replace(/校/g, "");
}

function getLocationLabels(event: AnchorEvent): string[] {
  return normalizeLocationPool(event.locationPool);
}

function toSummary(
  e: AnchorEvent,
  locationPool: string[],
  routePool: AnchorEventRoutePool,
  pois: Array<{
    id: number;
    name: string;
    gallery: string[];
  }>,
  fallbackGallery: string[],
): AnchorEventSummary {
  return {
    id: e.id,
    title: e.title,
    type: e.type,
    description: e.description,
    coverImage: e.coverImage,
    betaGroupQrCode: e.betaGroupQrCode,
    locationCount: locationPool.length,
    locationPool,
    routeCount: routePool.length,
    routePool,
    pois,
    fallbackGallery,
    prCreationPolicy: e.prCreationPolicy,
    canUserCreatePR: canUserCreatePRForAnchorEvent(e),
    status: e.status,
    createdAt: e.createdAt.toISOString(),
  };
}

export async function listAnchorEvents(): Promise<AnchorEventSummary[]> {
  const events = await repo.listActive();

  const uniqueLocationLabels = new Set<string>();
  for (const event of events) {
    for (const label of getLocationLabels(event)) {
      uniqueLocationLabels.add(label);
    }
  }

  const locationLabels = Array.from(uniqueLocationLabels);
  const exactPois = await findPoisByNames(locationLabels, {
    includeUnpublished: true,
  });
  const exactPoiByName = new Map(exactPois.map((poi) => [poi.name, poi]));
  const pois = exactPois.filter(isPublishedPoi);
  const poiByName = new Map<
    string,
    { id: number; name: string; gallery: string[] }
  >();
  for (const poi of pois) {
    poiByName.set(poi.name, {
      id: poi.id,
      name: poi.name,
      gallery: poi.gallery,
    });
  }

  const needNormalizedFallback = pois.length < locationLabels.length;
  const poisByNormalizedId = new Map<
    string,
    Array<{ id: number; name: string; gallery: string[] }>
  >();
  if (needNormalizedFallback) {
    const allPois = await poiRepo.listAll();
    for (const poi of allPois) {
      if (!isPublishedPoi(poi)) {
        continue;
      }
      const normalizedPoiName = normalizeLocationLookupKey(poi.name);
      if (!normalizedPoiName) {
        continue;
      }

      const existingPois = poisByNormalizedId.get(normalizedPoiName) ?? [];
      existingPois.push({
        id: poi.id,
        name: poi.name,
        gallery: poi.gallery,
      });
      poisByNormalizedId.set(normalizedPoiName, existingPois);
    }
  }

  return events.map((event) => {
    const locationPool = getLocationLabels(event).filter((label) => {
      const poi = exactPoiByName.get(label);
      return !poi || isPublishedPoi(poi);
    });
    const matchedPoisById = new Map<
      number,
      { id: number; name: string; gallery: string[] }
    >();
    const fallbackGallerySet = new Set<string>();

    for (const label of locationPool) {
      const exactPoi = poiByName.get(label);
      if (exactPoi) {
        matchedPoisById.set(exactPoi.id, exactPoi);
        for (const imageUrl of exactPoi.gallery) {
          const normalizedUrl = imageUrl.trim();
          if (!normalizedUrl) continue;
          fallbackGallerySet.add(normalizedUrl);
        }
        continue;
      }

      if (needNormalizedFallback) {
        const normalizedLabel = normalizeLocationLookupKey(label);
        if (normalizedLabel) {
          const normalizedPois = poisByNormalizedId.get(normalizedLabel) ?? [];
          for (const normalizedPoi of normalizedPois) {
            matchedPoisById.set(normalizedPoi.id, normalizedPoi);
            for (const imageUrl of normalizedPoi.gallery) {
              const normalizedUrl = imageUrl.trim();
              if (!normalizedUrl) continue;
              fallbackGallerySet.add(normalizedUrl);
            }
          }
        }
      }
    }

    return toSummary(
      event,
      locationPool,
      normalizeAnchorEventRoutePool(event.routePool),
      Array.from(matchedPoisById.values()),
      Array.from(fallbackGallerySet),
    );
  });
}
