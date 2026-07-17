import type { Poi } from "../../../entities/poi";

export const normalizePoiApplicationTitle = (value: string): string => value.trim();

export const normalizePoiApplicationImageUrl = (value: string): string => value.trim();

export const normalizePoiRejectReason = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
};

export const toPoiApplicationView = (poi: Poi) => ({
  id: poi.id,
  title: poi.name,
  status: poi.status,
  gallery: [...poi.gallery],
  imageUrl: poi.gallery[0] ?? null,
  submittedByUserId: poi.submittedByUserId,
  reviewedByUserId: poi.reviewedByUserId,
  reviewedAt: poi.reviewedAt?.toISOString() ?? null,
  rejectReason: poi.rejectReason,
  createdAt: poi.createdAt.toISOString(),
  updatedAt: poi.updatedAt.toISOString(),
});
