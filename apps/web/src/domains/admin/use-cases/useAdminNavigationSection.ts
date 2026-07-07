import { computed, type ComputedRef } from "vue";
import { useRoute } from "vue-router";

export const useAdminNavigationSection = <SectionId extends string>(
  defaultSectionId: SectionId,
  sectionIds: readonly SectionId[],
): ComputedRef<SectionId> => {
  const route = useRoute();
  const supportedSectionIds = new Set<string>(sectionIds);

  return computed(() => {
    const hashSectionId = route.hash.startsWith("#")
      ? route.hash.slice(1)
      : route.hash;
    return supportedSectionIds.has(hashSectionId)
      ? (hashSectionId as SectionId)
      : defaultSectionId;
  });
};
