import { throwHttpProblem } from "../../../lib/problem-details";
import { PRTypeConfigRepository } from "../../../repositories/PRTypeConfigRepository";
import type {
  PRDiscoveryCatalogItem,
  PRDiscoveryTypeDetail,
  PRDiscoveryViewMode,
  PRDiscoveryViewRatios,
} from "../contracts";
import { normalizeDiscoveryType, readTypeConfig } from "../services/read.service";
import { buildPRDiscoveryTypePlacePresentations } from "../services/type-presentation";

const repo = new PRTypeConfigRepository();

export const listPRDiscoveryCatalog = async (): Promise<PRDiscoveryCatalogItem[]> => {
  const rows = await repo.listAll();
  const presentations = await buildPRDiscoveryTypePlacePresentations(rows);
  return rows.map((row) => ({
    type: row.type,
    title: row.title,
    description: row.description,
    coverImage: row.coverImage,
    ...(presentations.get(row.type) ?? {
      locationCount: 0,
      locationPool: [],
      routeCount: 0,
      routePool: [],
      pois: [],
      fallbackGallery: [],
    }),
  }));
};

export const getPRDiscoveryTypeDetail = async (rawType: string): Promise<PRDiscoveryTypeDetail> => {
  const type = normalizeDiscoveryType(rawType);
  const config = await readTypeConfig(type);
  if (!config) {
    return throwHttpProblem({
      status: 404,
      detail: "PR type not found",
      code: "PR_DISCOVERY_TYPE_NOT_FOUND",
    });
  }
  const presentation = (await buildPRDiscoveryTypePlacePresentations([config])).get(
    config.type,
  ) ?? {
    locationCount: 0,
    locationPool: [],
    routeCount: 0,
    routePool: [],
    pois: [],
    fallbackGallery: [],
  };
  return {
    type: config.type,
    title: config.title,
    description: config.description,
    coverImage: config.coverImage,
    communityQrCode: config.communityQrCode ?? null,
    ...presentation,
    viewRatios: {
      FORM: config.discoveryFormRatio,
      CARD: config.discoveryCardRatio,
      LIST: config.discoveryListRatio,
    },
  };
};

export const resolvePRDiscoveryViewMode = (
  viewRatios: PRDiscoveryViewRatios,
  randomValue = Math.random(),
): PRDiscoveryViewMode => {
  const weights = [
    ["FORM", viewRatios.FORM],
    ["CARD", viewRatios.CARD],
    ["LIST", viewRatios.LIST],
  ] as const;
  const total = weights.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0);
  if (total <= 0) return "LIST";
  const bounded = Math.min(Math.max(randomValue, 0), 1);
  let cumulative = 0;
  let lastPositive: "FORM" | "CARD" | "LIST" = "LIST";
  for (const [view, weight] of weights) {
    const safeWeight = Math.max(0, weight);
    if (safeWeight > 0) lastPositive = view;
    cumulative += safeWeight;
    if (bounded < cumulative / total) return view;
  }
  return lastPositive;
};

export const getPRDiscoveryView = async (
  rawType: string,
): Promise<{
  type: string;
  viewMode: PRDiscoveryViewMode;
  viewRatios: PRDiscoveryViewRatios;
}> => {
  const type = normalizeDiscoveryType(rawType);
  const config = await readTypeConfig(type);
  const viewRatios = {
    FORM: config?.discoveryFormRatio ?? 0,
    CARD: config?.discoveryCardRatio ?? 0,
    LIST: config?.discoveryListRatio ?? 0,
  };
  return {
    type,
    viewMode: resolvePRDiscoveryViewMode(viewRatios),
    viewRatios,
  };
};
