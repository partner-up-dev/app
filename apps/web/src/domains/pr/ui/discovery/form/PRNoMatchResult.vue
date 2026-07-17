<template>
  <section class="pr-discovery-no-match-result">
    <section
      v-if="props.candidates.length > 0"
      class="candidate-list"
      data-region="pr-discovery-candidates"
      data-testid="pr-discovery.candidate-list"
    >
      <h2 class="candidate-list__title">
        {{ t("prDiscovery.candidateListTitle") }}
      </h2>

      <div class="candidate-list__items">
        <PRPreviewCard
          v-for="(candidate, index) in props.candidates"
          :key="candidate.prId"
          :pr-id="candidate.prId"
          :time-label="buildCandidateTimeLabel(candidate.time[0])"
          :cover-image="props.resolveCoverImage(candidate.location)"
          data-testid="pr-discovery.candidate-card"
          :data-pr-id="candidate.prId"
          @open-detail="emit('candidate-detail', candidate.prId, index + 1)"
        >
          <template #actions>
            <PRJoinAction
              :pr-id="candidate.prId"
              :pr-type="candidate.type"
              entry-surface="pr_discovery_form_candidate"
              :candidate-rank="index + 1"
              @joined="emit('join-candidate-joined', candidate.prId, index + 1)"
              @success-closed="emit('join-candidate-success-closed', candidate.prId, index + 1)"
            >
              <template #trigger="{ open, pending, disabled, joined, errorMessage }">
                <div class="candidate-join-flow">
                  <PuButton
                    shape="rect"
                    block
                    data-testid="pr-discovery.candidate.join"
                    :data-pr-id="candidate.prId"
                    :data-rank="index + 1"
                    :loading="pending"
                    :disabled="disabled"
                    @click="handleJoinCandidateClick(candidate.prId, index + 1, open)"
                  >
                    {{
                      joined
                        ? t("prPage.partnerSection.rosterJoined")
                        : t("prDiscovery.joinCandidateAction")
                    }}
                  </PuButton>
                  <PuInlineNotice v-if="errorMessage" tone="error" :message="errorMessage" />
                </div>
              </template>
            </PRJoinAction>
          </template>
        </PRPreviewCard>
      </div>
    </section>

    <PuEmptyState
      v-else
      align="start"
      icon="i-mdi-account-search-outline"
      :title="t('prDiscovery.noCandidateTitle')"
      :description="t('prDiscovery.noCandidateBody')"
    />

    <div v-if="props.showCreateFallback" class="no-match-actions">
      <PuButton
        shape="rect"
        tone="tertiary"
        variant="solid"
        block
        data-testid="pr-discovery.create-fallback"
        :loading="props.createPending"
        :disabled="props.createDisabled"
        @click="emit('create-fallback')"
      >
        {{ t("prDiscovery.createFallbackAction") }}
      </PuButton>
    </div>

    <PuInlineNotice
      v-if="props.createErrorMessage"
      tone="error"
      :message="props.createErrorMessage"
    />
  </section>
</template>

<script setup lang="ts">
import { PuButton, PuEmptyState, PuInlineNotice } from "@partner-up-dev/design-web";
import { useI18n } from "vue-i18n";
import {
  formatPRDiscoveryDateLabel,
  formatPRDiscoveryTimeLabel,
  isValidPRDiscoveryDateTime,
} from "@/domains/pr/model/pr-discovery-form";
import type { PRDiscoveryRecommendationResponse } from "@/domains/pr/model/pr-discovery-types";
import PRPreviewCard from "@/domains/pr/ui/primitives/PRPreviewCard.vue";
import PRJoinAction from "@/domains/pr/ui/sections/PRJoinAction.vue";

type RecommendationCandidate = PRDiscoveryRecommendationResponse["orderedCandidates"][number];

const props = defineProps<{
  type: string;
  candidates: readonly RecommendationCandidate[];
  createPending: boolean;
  createDisabled: boolean;
  showCreateFallback: boolean;
  createErrorMessage: string | null;
  resolveCoverImage: (location: string | null) => string | null;
}>();

const emit = defineEmits<{
  "candidate-detail": [prId: number, rank: number];
  "join-candidate": [prId: number, rank: number];
  "join-candidate-joined": [prId: number, rank: number];
  "join-candidate-success-closed": [prId: number, rank: number];
  "create-fallback": [];
}>();

const { t } = useI18n();

const buildCandidateTimeLabel = (startAt: string | null): string | null => {
  if (!isValidPRDiscoveryDateTime(startAt)) {
    return null;
  }

  return `${formatPRDiscoveryDateLabel(startAt)} ${formatPRDiscoveryTimeLabel(startAt)}`;
};

const handleJoinCandidateClick = (prId: number, rank: number, open: () => Promise<void>): void => {
  emit("join-candidate", prId, rank);
  void open();
};
</script>

<style lang="scss" scoped>
.pr-discovery-no-match-result,
.candidate-list,
.candidate-list__items,
.candidate-join-flow {
  display: flex;
  flex-direction: column;
}

.pr-discovery-no-match-result {
  flex: 1 1 auto;
  min-height: 0;
  gap: var(--sys-spacing-medium);
}

.candidate-join-flow {
  gap: var(--sys-spacing-small);
}

.candidate-list__title,
.no-match-actions {
  margin: 0;
}

.candidate-list__title {
  @include mx.pu-font(section);
}

.candidate-list {
  gap: var(--sys-spacing-small);
  min-height: 0;
}

.candidate-list__items {
  gap: var(--sys-spacing-small);
}

.no-match-actions {
  margin-top: auto;
}
</style>
