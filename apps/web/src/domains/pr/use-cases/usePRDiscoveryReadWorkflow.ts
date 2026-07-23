import { computed, type Ref, ref, watch } from "vue";
import {
  isPRAuthoringOptionsExhausted,
  isPRDiscoveryViewMode,
  type PRDiscoveryViewMode,
  readPRDiscoveryViewPreference,
  resolvePRDiscoveryViewMode,
  writePRDiscoveryViewPreference,
} from "@/domains/pr/model/discovery";
import type { PRDiscoveryCatalogItem } from "@/domains/pr/model/pr-discovery-types";
import { usePRAuthoringOptions } from "@/domains/pr/queries/usePRAuthoringOptions";
import {
  isPRDiscoveryViewResolutionTimeoutError,
  usePRDiscoveryCatalog,
  usePRDiscoveryDirectory,
  usePRDiscoveryTypeDetail,
  usePRDiscoveryView,
} from "@/domains/pr/queries/usePRDiscovery";
import { trackEvent } from "@/shared/telemetry/track";

export const parsePRDiscoveryTypeQuery = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export const parsePRDiscoveryDateQuery = (value: unknown): readonly string[] => {
  if (typeof value === "string") return value.trim() ? [value] : [];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return [];
};

export const parsePRDiscoveryViewQuery = (value: unknown): PRDiscoveryViewMode | null => {
  const normalized = typeof value === "string" ? value.toUpperCase() : null;
  return isPRDiscoveryViewMode(normalized) ? normalized : null;
};

type PRDiscoveryViewSelection = {
  explicitViewMode: PRDiscoveryViewMode | null;
  preferredViewMode: PRDiscoveryViewMode | null;
  serverViewMode?: unknown;
  viewTimedOut?: boolean;
};

export const requiresPRDiscoveryServerView = (
  explicitViewMode: PRDiscoveryViewMode | null,
  preferredViewMode: PRDiscoveryViewMode | null,
) => explicitViewMode === null && preferredViewMode === null;

export const resolvePRDiscoveryReadViewMode = ({
  explicitViewMode,
  preferredViewMode,
  serverViewMode,
  viewTimedOut = false,
}: PRDiscoveryViewSelection): PRDiscoveryViewMode =>
  resolvePRDiscoveryViewMode({
    serverViewMode: viewTimedOut ? "LIST" : serverViewMode,
    preferredViewMode: explicitViewMode ?? preferredViewMode,
  });

export const shufflePRDiscoveryCatalog = <T>(
  items: readonly T[],
  random: () => number = Math.random,
): T[] => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
};

type PRDiscoveryReadWorkflowOptions = {
  selectedType: Ref<string | null>;
  selectedDates: Ref<readonly string[]>;
  explicitViewMode: Ref<PRDiscoveryViewMode | null>;
  replaceViewMode: (viewMode: PRDiscoveryViewMode) => void;
  navigateToCatalog: () => void;
};

export const usePRDiscoveryReadWorkflow = ({
  selectedType,
  selectedDates,
  explicitViewMode,
  replaceViewMode,
  navigateToCatalog,
}: PRDiscoveryReadWorkflowOptions) => {
  const catalogQuery = usePRDiscoveryCatalog();
  const typeDetailQuery = usePRDiscoveryTypeDetail(selectedType);
  const directoryQuery = usePRDiscoveryDirectory(selectedType, selectedDates);
  const authoringQuery = usePRAuthoringOptions(selectedType);

  const catalogItems = computed(() => catalogQuery.data.value ?? []);
  const randomizedCatalog = ref<PRDiscoveryCatalogItem[]>([]);
  watch(
    catalogItems,
    (catalog) => {
      randomizedCatalog.value = shufflePRDiscoveryCatalog(catalog);
    },
    { immediate: true },
  );

  const selectedTypeDetail = computed(() => {
    const detail = typeDetailQuery.data.value;
    return detail?.type === selectedType.value ? detail : null;
  });
  const selectedAuthoringOptions = computed(() => {
    const options = authoringQuery.data.value;
    return options?.type === selectedType.value ? options : null;
  });
  const directoryCandidates = computed(() => directoryQuery.data.value?.candidates ?? []);
  const directoryListRecords = computed(() => directoryQuery.data.value?.listRecords ?? []);
  const directoryCardGroups = computed(() => directoryQuery.data.value?.cardGroups ?? []);

  const preferredViewMode = computed(() =>
    readPRDiscoveryViewPreference(
      typeof window === "undefined" ? null : window.localStorage,
      selectedType.value ?? "",
    ),
  );
  const requiresServerView = computed(() =>
    requiresPRDiscoveryServerView(explicitViewMode.value, preferredViewMode.value),
  );
  const viewQuery = usePRDiscoveryView(selectedType, requiresServerView);
  const isViewResolutionTimedOut = computed(() =>
    isPRDiscoveryViewResolutionTimeoutError(viewQuery.error.value),
  );
  const activeViewMode = ref<PRDiscoveryViewMode>(
    resolvePRDiscoveryReadViewMode({
      explicitViewMode: explicitViewMode.value,
      preferredViewMode: preferredViewMode.value,
      serverViewMode: isViewResolutionTimedOut.value ? "LIST" : viewQuery.data.value?.viewMode,
    }),
  );
  const isViewResolved = computed(
    () =>
      Boolean(selectedType.value) &&
      Boolean(
        isPRDiscoveryViewMode(viewQuery.data.value?.viewMode) ||
        isViewResolutionTimedOut.value ||
        explicitViewMode.value ||
        preferredViewMode.value,
      ),
  );

  watch(
    [
      selectedType,
      () => viewQuery.data.value?.viewMode,
      isViewResolutionTimedOut,
      explicitViewMode,
      preferredViewMode,
    ],
    ([type, serverViewMode, viewTimedOut, explicitMode, preferredMode]) => {
      activeViewMode.value = type
        ? resolvePRDiscoveryReadViewMode({
            explicitViewMode: explicitMode,
            preferredViewMode: preferredMode,
            serverViewMode,
            viewTimedOut,
          })
        : "LIST";
    },
    { immediate: true },
  );
  watch(
    () => viewQuery.data.value?.viewMode,
    (mode) => {
      if (
        !selectedType.value ||
        !isPRDiscoveryViewMode(mode) ||
        isViewResolutionTimedOut.value ||
        explicitViewMode.value ||
        preferredViewMode.value
      ) {
        return;
      }
      writePRDiscoveryViewPreference(
        typeof window === "undefined" ? null : window.localStorage,
        mode,
        selectedType.value,
      );
    },
    { immediate: true },
  );

  const isDiscoveryLoading = computed(
    () =>
      (requiresServerView.value && viewQuery.isLoading.value) ||
      typeDetailQuery.isLoading.value ||
      authoringQuery.isLoading.value ||
      (activeViewMode.value !== "FORM" && directoryQuery.isLoading.value),
  );
  const discoveryErrorMessage = computed(
    () =>
      (requiresServerView.value && !isViewResolutionTimedOut.value
        ? viewQuery.error.value?.message
        : null) ??
      typeDetailQuery.error.value?.message ??
      authoringQuery.error.value?.message ??
      (activeViewMode.value !== "FORM" ? directoryQuery.error.value?.message : null) ??
      null,
  );
  const pageStatePlacement = computed<"center" | "start">(() =>
    isDiscoveryLoading.value || Boolean(discoveryErrorMessage.value) ? "center" : "start",
  );
  const isDiscoveryExhausted = computed(
    () =>
      activeViewMode.value === "LIST" &&
      isPRAuthoringOptionsExhausted(selectedAuthoringOptions.value),
  );
  const hasLoadFailed = computed(() => Boolean(discoveryErrorMessage.value));

  const seenSurfaceKeys = new Set<string>();
  const seenCandidateImpressionKeys = new Set<string>();
  watch(
    [selectedType, activeViewMode, isViewResolved],
    ([type, viewMode, viewResolved]) => {
      if (!type || !viewResolved) return;
      const key = `${type}:${viewMode}`;
      if (seenSurfaceKeys.has(key)) return;
      seenSurfaceKeys.add(key);
      trackEvent("pr.discovery.surface.viewed", {
        prType: type,
        viewMode,
        origin: "PR_DISCOVERY",
      });
    },
    { immediate: true },
  );
  watch(
    [selectedType, activeViewMode, isViewResolved, directoryCandidates],
    ([type, viewMode, viewResolved, candidates]) => {
      if (!type || !viewResolved || viewMode === "FORM") return;
      candidates.forEach((candidate, index) => {
        const key = `${type}:${viewMode}:${candidate.prId}`;
        if (seenCandidateImpressionKeys.has(key)) return;
        seenCandidateImpressionKeys.add(key);
        trackEvent("pr.discovery.candidate.impression", {
          prType: type,
          viewMode,
          origin: "PR_DISCOVERY",
          prId: candidate.prId,
          rank: index + 1,
        });
      });
    },
    { immediate: true },
  );

  const setViewMode = (viewMode: PRDiscoveryViewMode) => {
    activeViewMode.value = viewMode;
    writePRDiscoveryViewPreference(
      typeof window === "undefined" ? null : window.localStorage,
      viewMode,
      selectedType.value ?? "",
    );
    replaceViewMode(viewMode);
  };

  return {
    selectedType,
    catalogItems,
    randomizedCatalog,
    isCatalogLoading: computed(() => catalogQuery.isLoading.value),
    catalogError: computed(() => catalogQuery.error.value),
    selectedTypeDetail,
    selectedAuthoringOptions,
    directoryCandidates,
    directoryListRecords,
    directoryCardGroups,
    activeViewMode,
    isViewResolved,
    isDiscoveryLoading,
    discoveryErrorMessage,
    pageStatePlacement,
    isDiscoveryExhausted,
    hasLoadFailed,
    refetchAuthoringOptions: authoringQuery.refetch,
    setViewMode,
    returnToCatalog: navigateToCatalog,
  };
};

export type PRDiscoveryReadWorkflow = ReturnType<typeof usePRDiscoveryReadWorkflow>;
