<script lang="ts">
import type { PRDiscoveryViewMode as PRDiscoveryViewModeForExit } from "@/domains/pr/model/discovery";
import type { PRDiscoveryCatalogItem } from "@/domains/pr/model/pr-discovery-types";

export const isPRDiscoveryFormViewExit = (
  previousViewMode: PRDiscoveryViewModeForExit | undefined,
  nextViewMode: PRDiscoveryViewModeForExit,
) => previousViewMode === "FORM" && nextViewMode !== "FORM";

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
</script>

<template>
  <div class="pr-discovery-panel" data-testid="prd.panel">
    <div v-if="!selectedType" class="pr-discovery-panel__catalog" data-testid="prd.catalog">
      <div v-if="catalogQuery.isLoading.value" class="pr-discovery-panel__catalog-state">
        <PuLoadingState :message="t('common.loading')" />
      </div>
      <div v-else-if="catalogQuery.error.value" class="pr-discovery-panel__catalog-state">
        <PuInlineNotice
          tone="error"
          :message="t('prDiscovery.loadFailed')"
          data-testid="prd.catalog.error"
        />
      </div>
      <template v-else>
        <div v-if="randomizedCatalog.length > 0" class="pr-discovery-panel__catalog-list">
          <PRDiscoveryCard
            v-for="item in randomizedCatalog"
            :key="item.type"
            :item="item"
            data-testid="prd.catalog.item"
          />
        </div>
        <div v-else class="pr-discovery-panel__catalog-state">
          <PuInlineNotice
            tone="info"
            :message="t('prDiscovery.catalogEmpty')"
            data-testid="prd.catalog.empty"
          />
        </div>
      </template>
    </div>
    <section v-else class="pr-discovery-panel__results" data-testid="prd.results">
      <PRDiscoverySurface
        :view-mode="activeViewMode"
        :show-toolbar="false"
        :loading="isDiscoveryLoading"
        :empty="false"
        :error-message="discoveryErrorMessage"
        @update:view-mode="setViewMode"
      >
        <template #error-actions>
          <PuButton
            tone="neutral"
            variant="outline"
            size="sm"
            data-testid="prd.state.error.back"
            @click="returnToCatalog"
          >
            {{ t("prDiscovery.backAction") }}
          </PuButton>
        </template>
        <template #list>
          <PRDiscoveryListView
            :type="selectedType"
            :type-detail="selectedTypeDetail"
            :candidates="directoryQuery.data.value?.candidates ?? []"
            :list-records="directoryQuery.data.value?.listRecords ?? []"
            :authoring-options="selectedAuthoringOptions"
            :other-types="catalogQuery.data.value ?? []"
            :show-create="userCreationAllowed"
            :pending="formPending"
            :error-message="discoveryErrorMessage"
            :exhausted="isDiscoveryExhausted"
            @record-detail="openPersistedPR"
            @create-direct="handleCreateRequest"
          />
        </template>
        <template #card>
          <PRDiscoveryCardStack
            :type="selectedType"
            :type-detail="selectedTypeDetail"
            :items="directoryQuery.data.value?.candidates ?? []"
            :card-groups="directoryQuery.data.value?.cardGroups ?? []"
            :authoring-options="selectedAuthoringOptions"
            :show-create="userCreationAllowed"
            :pending="formPending"
            :error-message="discoveryErrorMessage"
            @detail="openPersistedPR"
            @create-direct="handleCreateRequest"
          />
        </template>
        <template #form>
          <PRDiscoveryFormView
            :options="selectedAuthoringOptions"
            :candidates="recommendationResult?.orderedCandidates ?? []"
            :matched-candidate="recommendationResult?.matchedCandidate ?? null"
            :pending="formPending"
            :error-message="formErrorMessage"
            :show-create="userCreationAllowed"
            :no-match-resolved="recommendationResult !== null"
            @submit="recommendCandidates"
            @create="createFromSelection"
            @selection-change="handleFormSelectionChange"
            @view-all="() => setViewMode('LIST')"
            @candidate-detail="openPersistedPR"
            @candidate-join-success-closed="handleCandidateJoinSuccessClosed"
            @location-application="openLocationApplication"
            @route-application="openRouteApplication"
          />
        </template>
      </PRDiscoverySurface>
    </section>
  </div>
</template>

<script setup lang="ts">
import { PuButton, PuInlineNotice, PuLoadingState } from "@partner-up-dev/design-web";
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import {
  isPRAuthoringOptionsExhausted,
  isPRDiscoveryViewMode,
  type PRDiscoveryCreateReplaySelection,
  type PRDiscoveryViewMode,
  readPRDiscoveryViewPreference,
  resolvePRDiscoveryViewMode,
  writePRDiscoveryViewPreference,
} from "@/domains/pr/model/discovery";
import { type PRFormFields, toPartnerRequestFields } from "@/domains/pr/model/types";
import { usePRAuthoringOptions } from "@/domains/pr/queries/usePRAuthoringOptions";
import { useCreatePRFromStructured } from "@/domains/pr/queries/usePRCreate";
import {
  isPRDiscoveryViewResolutionTimeoutError,
  usePRDiscoveryCatalog,
  usePRDiscoveryDirectory,
  usePRDiscoveryRecommendation,
  usePRDiscoveryTypeDetail,
  usePRDiscoveryView,
} from "@/domains/pr/queries/usePRDiscovery";
import { prDetailPath } from "@/domains/pr/routing/routes";
import PRDiscoveryCard from "@/domains/pr/ui/discovery/PRDiscoveryCard.vue";
import PRDiscoveryCardStack from "@/domains/pr/ui/discovery/PRDiscoveryCardView/PRDiscoveryCardStack.vue";
import PRDiscoveryFormView, {
  type PRDiscoveryFormSelection,
} from "@/domains/pr/ui/discovery/PRDiscoveryFormView.vue";
import PRDiscoveryListView from "@/domains/pr/ui/discovery/PRDiscoveryListView.vue";
import PRDiscoverySurface from "@/domains/pr/ui/PRDiscoverySurface.vue";
import type { PRDiscoveryDirectCreateCommand } from "@/domains/pr/use-cases/usePRDiscoveryCreation";
import { ensureAuthSessionBootstrapped } from "@/processes/auth/useAuthSessionBootstrap";
import { requestWeChatOAuthLogin } from "@/processes/wechat/oauth-login";
import {
  clearPendingWeChatAction,
  readPendingWeChatAction,
  setPendingWeChatAction,
} from "@/processes/wechat/pending-wechat-action";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";
import { trackEvent } from "@/shared/telemetry/track";

type DirectCreateSelection =
  | PRDiscoveryFormSelection
  | PRDiscoveryDirectCreateCommand
  | (PRDiscoveryCreateReplaySelection & {
      allowEditAfterReady: import("@partner-up-dev/backend").PRAllowEditAfterReady | null;
    });

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const userSessionStore = useUserSessionStore();
const selectedType = computed(() => {
  const value = route.query.type;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
});

const catalogQuery = usePRDiscoveryCatalog();
const randomizedCatalog = ref<PRDiscoveryCatalogItem[]>([]);
watch(
  () => catalogQuery.data.value,
  (catalog) => {
    randomizedCatalog.value = shufflePRDiscoveryCatalog(catalog ?? []);
  },
  { immediate: true },
);
const selectedDates = computed<readonly string[]>(() => {
  const value = route.query.date;
  if (typeof value === "string") return value.trim() ? [value] : [];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return [];
});
const typeDetailQuery = usePRDiscoveryTypeDetail(selectedType);
const directoryQuery = usePRDiscoveryDirectory(selectedType, selectedDates);
const authoringQuery = usePRAuthoringOptions(selectedType);
const recommendationMutation = usePRDiscoveryRecommendation();
const createMutation = useCreatePRFromStructured();
let recommendationRequestId = 0;
const recommendationResult = ref<Awaited<
  ReturnType<typeof recommendationMutation.mutateAsync>
> | null>(null);
const selectedTypeDetail = computed(() => {
  const detail = typeDetailQuery.data.value;
  return detail?.type === selectedType.value ? detail : null;
});
const selectedAuthoringOptions = computed(() => {
  const options = authoringQuery.data.value;
  return options?.type === selectedType.value ? options : null;
});
const formModeResultState = computed<"selection" | "no-match">(() =>
  recommendationResult.value && !recommendationResult.value.matchedCandidate
    ? "no-match"
    : "selection",
);
const userCreationAllowed = computed(
  () => selectedAuthoringOptions.value?.creationAllowed !== false,
);
const seenSurfaceKeys = new Set<string>();
const seenCandidateImpressionKeys = new Set<string>();

const resetPRDiscoveryFormState = () => {
  recommendationRequestId += 1;
  recommendationMutation.reset();
  createMutation.reset();
  recommendationResult.value = null;
};

const preferredViewMode = computed(() =>
  readPRDiscoveryViewPreference(
    typeof window === "undefined" ? null : window.localStorage,
    selectedType.value ?? "",
  ),
);
const explicitViewMode = computed(() => {
  const value = route.query.view;
  const normalized = typeof value === "string" ? value.toUpperCase() : null;
  return isPRDiscoveryViewMode(normalized) ? normalized : null;
});
const requiresServerView = computed(
  () => explicitViewMode.value === null && preferredViewMode.value === null,
);
const viewQuery = usePRDiscoveryView(selectedType, requiresServerView);
const isViewResolutionTimedOut = computed(() =>
  isPRDiscoveryViewResolutionTimeoutError(viewQuery.error.value),
);
const activeViewMode = ref<PRDiscoveryViewMode>(
  resolvePRDiscoveryViewMode({
    serverViewMode: isViewResolutionTimedOut.value ? "LIST" : viewQuery.data.value?.viewMode,
    preferredViewMode: explicitViewMode.value ?? preferredViewMode.value,
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
      ? resolvePRDiscoveryViewMode({
          serverViewMode: viewTimedOut ? "LIST" : serverViewMode,
          preferredViewMode: explicitMode ?? preferredMode,
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
    )
      return;
    writePRDiscoveryViewPreference(
      typeof window === "undefined" ? null : window.localStorage,
      mode,
      selectedType.value,
    );
  },
  { immediate: true },
);

watch(selectedType, resetPRDiscoveryFormState);
watch(activeViewMode, (nextViewMode, previousViewMode) => {
  if (isPRDiscoveryFormViewExit(previousViewMode, nextViewMode)) {
    resetPRDiscoveryFormState();
  }
});

watch(
  [selectedType, activeViewMode],
  ([type, viewMode]) => {
    if (!type || !isViewResolved.value) return;
    const key = `${type}:${viewMode}`;
    if (seenSurfaceKeys.has(key)) return;
    seenSurfaceKeys.add(key);
    trackEvent("pr_discovery_surface_viewed", {
      prType: type,
      viewMode,
      origin: "PR_DISCOVERY",
    });
  },
  { immediate: true },
);

watch(
  [selectedType, activeViewMode, () => directoryQuery.data.value?.candidates],
  ([type, viewMode, candidates]) => {
    if (!type || !isViewResolved.value || viewMode === "FORM" || !candidates) return;
    candidates.forEach((candidate, index) => {
      const key = `${type}:${viewMode}:${candidate.prId}`;
      if (seenCandidateImpressionKeys.has(key)) return;
      seenCandidateImpressionKeys.add(key);
      trackEvent("pr_discovery_candidate_impression", {
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

const isDiscoveryLoading = computed(
  () =>
    (requiresServerView.value && viewQuery.isLoading.value) ||
    typeDetailQuery.isLoading.value ||
    authoringQuery.isLoading.value ||
    (activeViewMode.value !== "FORM" && directoryQuery.isLoading.value),
);
const formPending = computed(
  () => recommendationMutation.isPending.value || createMutation.isPending.value,
);
const formErrorMessage = computed(
  () => recommendationMutation.error.value?.message ?? createMutation.error.value?.message ?? null,
);
const pageStatePlacement = computed<"center" | "start">(() =>
  isDiscoveryLoading.value || Boolean(discoveryErrorMessage.value) ? "center" : "start",
);
const isDiscoveryExhausted = computed(
  () =>
    activeViewMode.value === "LIST" &&
    isPRAuthoringOptionsExhausted(selectedAuthoringOptions.value),
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

const setViewMode = (viewMode: PRDiscoveryViewMode) => {
  activeViewMode.value = viewMode;
  writePRDiscoveryViewPreference(
    typeof window === "undefined" ? null : window.localStorage,
    viewMode,
    selectedType.value ?? "",
  );
  void router.replace({ query: { ...route.query, view: viewMode.toLowerCase() } });
};

const returnToCatalog = () => {
  void router.push({ name: "pr-discovery" });
};

const openCandidate = (path: string, prId: number) => {
  const type = selectedType.value;
  if (!type) return;
  trackEvent("pr_discovery_candidate_action", {
    prType: type,
    viewMode: activeViewMode.value,
    origin: "PR_DISCOVERY",
    prId,
    action: "DETAIL",
  });
  void router.push(path);
};

const openPersistedPR = (record: { canonicalPath: string; prId: number }) => {
  openCandidate(record.canonicalPath, record.prId);
};
const handleCandidateJoinSuccessClosed = (prId: number) => {
  void router.push(`${prDetailPath(prId)}?entry=join&origin=PR_DISCOVERY`);
};

const openLocationApplication = () => {
  const type = selectedType.value;
  if (!type) return;
  void router.push({ name: "poi-location-apply", query: { type } });
};

const openRouteApplication = () => {
  const type = selectedType.value;
  if (!type) return;
  void router.push({ name: "pr-route-application", query: { type } });
};

const createFromSelection = (selection: DirectCreateSelection) => {
  const type = selectedType.value;
  if (!type || !userCreationAllowed.value) return;
  void createOrdinaryPR(selection);
};

const handleFormSelectionChange = () => {
  resetPRDiscoveryFormState();
};

const handleCreateRequest = (selection: DirectCreateSelection) => {
  createFromSelection(selection);
};

const createOrdinaryPR = async (selection: DirectCreateSelection) => {
  const type = selectedType.value;
  const options = selectedAuthoringOptions.value;
  if (!type || !options || !userCreationAllowed.value) return;
  const isFormSelection = "createTimeWindow" in selection;
  const timeWindow = isFormSelection ? selection.createTimeWindow : selection.timeWindows[0];
  if (!timeWindow?.startAt) return;
  const allowEditAfterReady =
    "allowEditAfterReady" in selection ? selection.allowEditAfterReady : null;
  const formFields: PRFormFields = {
    title: undefined,
    type,
    time: [timeWindow.startAt, timeWindow.endAt ?? null],
    location: selection.place.kind === "location" ? selection.place.location : null,
    route: selection.place.kind === "route" ? selection.place.route : null,
    minPartners: options.authoringDefaults.minPartners ?? 2,
    maxPartners: options.authoringDefaults.maxPartners,
    partners: [],
    budget: null,
    preferences: selection.preferences,
    notes: options.authoringDefaults.notes,
    meetingPoint: null,
  };
  try {
    await ensureAuthSessionBootstrapped();
    if (!userSessionStore.isAuthenticated) {
      const selectionForPending: PRDiscoveryCreateReplaySelection = {
        type,
        timeWindows: [{ startAt: timeWindow.startAt, endAt: timeWindow.endAt ?? null }],
        place: selection.place,
        preferences: [...selection.preferences],
      };
      setPendingWeChatAction({
        kind: "PR_DISCOVERY_CREATE",
        selection: selectionForPending,
        allowEditAfterReady,
      });
      if (typeof window !== "undefined") requestWeChatOAuthLogin(window.location.href);
      return;
    }
    const result = await createMutation.mutateAsync({
      fields: toPartnerRequestFields(formFields),
      createSource: "PR_DISCOVERY",
      allowEditAfterReady,
    });
    await router.push(`${result.canonicalPath}?entry=create&origin=PR_DISCOVERY`);
  } catch {
    if (!userSessionStore.isAuthenticated && typeof window !== "undefined") {
      const selectionForPending: PRDiscoveryCreateReplaySelection = {
        type,
        timeWindows: [{ startAt: timeWindow.startAt, endAt: timeWindow.endAt ?? null }],
        place: selection.place,
        preferences: [...selection.preferences],
      };
      setPendingWeChatAction({
        kind: "PR_DISCOVERY_CREATE",
        selection: selectionForPending,
        allowEditAfterReady,
      });
      requestWeChatOAuthLogin(window.location.href);
    }
    // The mutation owns the user-visible error state in the FORM surface.
  }
};

onMounted(async () => {
  await ensureAuthSessionBootstrapped();
  const pending = readPendingWeChatAction();
  if (
    pending?.kind === "PR_DISCOVERY_CREATE" &&
    pending.selection.type === selectedType.value &&
    userSessionStore.isAuthenticated
  ) {
    if (!selectedAuthoringOptions.value) {
      const result = await authoringQuery.refetch();
      if (!result.data || result.data.type !== selectedType.value) return;
    }
    clearPendingWeChatAction();
    void createOrdinaryPR({
      ...pending.selection,
      allowEditAfterReady: pending.allowEditAfterReady,
    });
  }
});

const returnToSelection = () => {
  resetPRDiscoveryFormState();
};

const hasLoadFailed = computed(() => Boolean(discoveryErrorMessage.value));

defineExpose({
  activeViewMode,
  setViewMode,
  returnToSelection,
  formModeResultState,
  pageStatePlacement,
  isViewResolved,
  hasLoadFailed,
});

const recommendCandidates = async (selection: PRDiscoveryFormSelection) => {
  const type = selectedType.value;
  if (!type) return;
  const requestId = ++recommendationRequestId;
  recommendationResult.value = null;
  trackEvent("pr_discovery_criteria_submitted", {
    prType: type,
    viewMode: activeViewMode.value,
    origin: "PR_DISCOVERY",
  });
  try {
    const result = await recommendationMutation.mutateAsync({
      type,
      place: selection.place,
      timeWindows: selection.timeWindows,
      preferences: selection.preferences,
    });
    if (requestId !== recommendationRequestId || selectedType.value !== type) return;
    recommendationResult.value = result;
    trackEvent("pr_discovery_recommendation_returned", {
      prType: type,
      viewMode: activeViewMode.value,
      origin: "PR_DISCOVERY",
      outcome: result.matchedCandidate ? "matched" : "no_match",
    });
    const visibleCandidates = result.matchedCandidate
      ? [result.matchedCandidate]
      : result.orderedCandidates;
    visibleCandidates.forEach((candidate, index) => {
      trackEvent("pr_discovery_candidate_impression", {
        prType: type,
        viewMode: activeViewMode.value,
        origin: "PR_DISCOVERY",
        prId: candidate.prId,
        rank: index + 1,
      });
    });
    if (
      !result.matchedCandidate &&
      result.orderedCandidates.length === 0 &&
      userCreationAllowed.value
    ) {
      await createOrdinaryPR(selection);
    }
  } catch {
    // The mutation owns the user-visible Problem Details error state.
  }
};
</script>

<style lang="scss" scoped>
.pr-discovery-panel {
  display: flex;
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}
.pr-discovery-panel__results {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
}
.pr-discovery-panel__catalog {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.pr-discovery-panel__catalog-list {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}
.pr-discovery-panel__catalog-state {
  padding-block: calc(var(--sys-spacing-large) * 2);
  text-align: center;
}
</style>
