<script lang="ts">
import type { PRDiscoveryViewMode as PRDiscoveryViewModeForExit } from "@/domains/pr/model/discovery";

export const isPRDiscoveryFormViewExit = (
  previousViewMode: PRDiscoveryViewModeForExit | undefined,
  nextViewMode: PRDiscoveryViewModeForExit,
) => previousViewMode === "FORM" && nextViewMode !== "FORM";
</script>

<template>
  <div class="pr-discovery-panel" data-testid="prd.panel">
    <div v-if="!selectedType" class="pr-discovery-panel__catalog" data-testid="prd.catalog">
      <div v-if="isCatalogLoading" class="pr-discovery-panel__catalog-state">
        <PuLoadingState :message="t('common.loading')" />
      </div>
      <div v-else-if="catalogError" class="pr-discovery-panel__catalog-state">
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
            :candidates="directoryCandidates"
            :list-records="directoryListRecords"
            :authoring-options="selectedAuthoringOptions"
            :other-types="catalogItems"
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
            :items="directoryCandidates"
            :card-groups="directoryCardGroups"
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
  <PRCreateAuthDisclosure
    :open="showAuthDisclosure"
    @cancel="authGate.cancelAuth"
    @confirm="authGate.confirmAuth"
  />
</template>

<script setup lang="ts">
import { PuButton, PuInlineNotice, PuLoadingState } from "@partner-up-dev/design-web";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { type PRFormFields, toPartnerRequestFields } from "@/domains/pr/model/types";
import { useCreatePRFromStructured } from "@/domains/pr/queries/usePRCreate";
import { usePRDiscoveryRecommendation } from "@/domains/pr/queries/usePRDiscovery";
import { prDetailPath } from "@/domains/pr/routing/routes";
import PRDiscoveryCard from "@/domains/pr/ui/discovery/PRDiscoveryCard.vue";
import PRDiscoveryCardStack from "@/domains/pr/ui/discovery/PRDiscoveryCardView/PRDiscoveryCardStack.vue";
import PRDiscoveryFormView, {
  type PRDiscoveryFormSelection,
} from "@/domains/pr/ui/discovery/PRDiscoveryFormView.vue";
import PRDiscoveryListView from "@/domains/pr/ui/discovery/PRDiscoveryListView.vue";
import PRDiscoverySurface from "@/domains/pr/ui/PRDiscoverySurface.vue";
import PRCreateAuthDisclosure from "@/domains/pr/ui/sections/PRCreateAuthDisclosure.vue";
import type { PRDiscoveryDirectCreateCommand } from "@/domains/pr/use-cases/usePRDiscoveryCreation";
import type { PRDiscoveryReadWorkflow } from "@/domains/pr/use-cases/usePRDiscoveryReadWorkflow";
import { usePRCreateAuthGate } from "@/domains/pr/use-cases/usePRCreateAuthGate";
import { trackEvent } from "@/shared/telemetry/track";

type DirectCreateSelection =
  | PRDiscoveryFormSelection
  | PRDiscoveryDirectCreateCommand;

const props = defineProps<{ readWorkflow: PRDiscoveryReadWorkflow }>();
const router = useRouter();
const { t } = useI18n();
const authGate = usePRCreateAuthGate();
const showAuthDisclosure = authGate.showAuthDisclosure;
const {
  activeViewMode,
  catalogError,
  catalogItems,
  directoryCandidates,
  directoryCardGroups,
  directoryListRecords,
  discoveryErrorMessage,
  isCatalogLoading,
  isDiscoveryExhausted,
  isDiscoveryLoading,
  randomizedCatalog,
  returnToCatalog,
  selectedAuthoringOptions,
  selectedType,
  selectedTypeDetail,
  setViewMode,
} = props.readWorkflow;
const recommendationMutation = usePRDiscoveryRecommendation();
const createMutation = useCreatePRFromStructured();
let recommendationRequestId = 0;
const recommendationResult = ref<Awaited<
  ReturnType<typeof recommendationMutation.mutateAsync>
> | null>(null);
const formModeResultState = computed<"selection" | "no-match">(() =>
  recommendationResult.value && !recommendationResult.value.matchedCandidate
    ? "no-match"
    : "selection",
);
const userCreationAllowed = computed(
  () => selectedAuthoringOptions.value?.creationAllowed !== false,
);

const resetPRDiscoveryFormState = () => {
  recommendationRequestId += 1;
  recommendationMutation.reset();
  createMutation.reset();
  recommendationResult.value = null;
};

watch(selectedType, resetPRDiscoveryFormState);
watch(activeViewMode, (nextViewMode, previousViewMode) => {
  if (isPRDiscoveryFormViewExit(previousViewMode, nextViewMode)) {
    resetPRDiscoveryFormState();
  }
});

const formPending = computed(
  () => recommendationMutation.isPending.value || createMutation.isPending.value,
);
const formErrorMessage = computed(
  () => recommendationMutation.error.value?.message ?? createMutation.error.value?.message ?? null,
);
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
    if (!(await authGate.ensureCreateAuth())) return;
    const result = await createMutation.mutateAsync({
      fields: toPartnerRequestFields(formFields),
      createSource: "PR_DISCOVERY",
      allowEditAfterReady,
    });
    await router.push(`${result.canonicalPath}?entry=create&origin=PR_DISCOVERY`);
  } catch {
    // The mutation owns the user-visible error state in the FORM surface.
  }
};

const returnToSelection = () => {
  resetPRDiscoveryFormState();
};

defineExpose({
  returnToSelection,
  formModeResultState,
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
