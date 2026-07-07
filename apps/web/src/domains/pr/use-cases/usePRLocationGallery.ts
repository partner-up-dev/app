import { computed, type Ref } from "vue";
import { usePoisByNames } from "@/shared/poi/queries/usePoisByIds";

export const usePRLocationGallery = (
  location: Ref<string | null | undefined>,
) => {
  const locationId = computed(() => {
    const rawLocation = location.value;
    if (!rawLocation) return null;
    const normalized = rawLocation.trim();
    return normalized.length > 0 ? normalized : null;
  });

  const poiNamesCsv = computed(() => locationId.value);
  const { data: poisByNamesData } = usePoisByNames(poiNamesCsv);

  const locationGallery = computed(() => {
    const targetLocationId = locationId.value;
    if (!targetLocationId) return [];

    const matchedPoi = (poisByNamesData.value ?? []).find(
      (poi) => poi.name === targetLocationId,
    );
    if (!matchedPoi) return [];

    return matchedPoi.gallery
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
  });

  return {
    locationId,
    locationGallery,
  };
};
