<template>
  <section class="form-mode-no-match-result">
    <section
      v-if="props.candidates.length > 0"
      class="candidate-list"
      data-region="form-mode-candidates"
      data-testid="anchor-event-form-mode.candidate-list"
    >
      <h2 class="candidate-list__title">
        {{ t("anchorEvent.formMode.candidateListTitle") }}
      </h2>

      <div class="candidate-list__items">
        <PRPreviewCard
          v-for="(candidate, index) in props.candidates"
          :key="candidate.pr.id"
          :pr-id="candidate.pr.id"
          :time-label="buildCandidateTimeLabel(candidate.pr.time[0])"
          :cover-image="props.resolveCoverImage(candidate.pr.location)"
          data-testid="anchor-event-form-mode.candidate-card"
          :data-pr-id="candidate.pr.id"
          @open-detail="emit('candidate-detail', candidate.pr.id, index + 1)"
        >
          <template #actions>
            <PRJoinAction
              :pr-id="candidate.pr.id"
              :scenario-type="candidate.pr.type"
              :event-id="props.eventId"
              entry-surface="form_mode_candidate"
              :candidate-rank="index + 1"
              @joined="
                emit('join-candidate-joined', candidate.pr.id, index + 1)
              "
              @success-closed="
                emit('join-candidate-success-closed', candidate.pr.id, index + 1)
              "
            >
              <template
                #trigger="{ open, pending, disabled, joined, errorMessage }"
              >
                <div class="candidate-join-flow">
                  <PuButton
                    shape="rect"

                    block
                    data-testid="anchor-event-form-mode.candidate.join"
                    :data-pr-id="candidate.pr.id"
                    :data-rank="index + 1"
                    :loading="pending"
                    :disabled="disabled"
                    @click="
                      handleJoinCandidateClick(candidate.pr.id, index + 1, open)
                    "
                  >
                    {{
                      joined
                        ? t("prPage.partnerSection.rosterJoined")
                        : t("anchorEvent.formMode.joinCandidateAction")
                    }}
                  </PuButton>
                  <p
                    v-if="errorMessage"
                    class="inline-message inline-message--error"
                  >
                    {{ errorMessage }}
                  </p>
                </div>
              </template>
            </PRJoinAction>
          </template>
        </PRPreviewCard>
      </div>
    </section>

    <section v-else class="no-match-hero">
      <h2 class="no-match-hero__title">
        {{ t("anchorEvent.formMode.noCandidateTitle") }}
      </h2>
      <p class="no-match-hero__body">
        {{ t("anchorEvent.formMode.noCandidateBody") }}
      </p>
    </section>

    <div v-if="props.showCreateFallback" class="no-match-actions">
      <PuButton
        shape="rect"
        tone="tertiary" variant="solid"

        block
        data-testid="anchor-event-form-mode.create-fallback"
        :loading="props.createPending"
        :disabled="props.createDisabled"
        @click="emit('create-fallback')"
      >
        {{ t("anchorEvent.formMode.createFallbackAction") }}
      </PuButton>
    </div>

    <p
      v-if="props.createErrorMessage"
      class="inline-message inline-message--error"
    >
      {{ props.createErrorMessage }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { AnchorEventFormModeRecommendationResponse } from "@/domains/event/model/types";
import {
  formatFormModeDateLabel,
  formatFormModeTimeLabel,
  isValidFormModeDateTime,
} from "@/domains/event/model/form-mode";
import PRPreviewCard from "@/domains/pr/ui/primitives/PRPreviewCard.vue";
import PRJoinAction from "@/domains/pr/ui/sections/PRJoinAction.vue";
import { PuButton } from "@partner-up-dev/design-web";

type RecommendationCandidate =
  AnchorEventFormModeRecommendationResponse["orderedCandidates"][number];

const props = defineProps<{
  eventId: number;
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
  if (!isValidFormModeDateTime(startAt)) {
    return null;
  }

  return `${formatFormModeDateLabel(startAt)} ${formatFormModeTimeLabel(
    startAt,
  )}`;
};

const handleJoinCandidateClick = (
  prId: number,
  rank: number,
  open: () => Promise<void>,
): void => {
  emit("join-candidate", prId, rank);
  void open();
};
</script>

<style lang="scss" scoped>
.form-mode-no-match-result,
.candidate-list,
.candidate-list__items,
.candidate-join-flow {
  display: flex;
  flex-direction: column;
}

.form-mode-no-match-result {
  flex: 1 1 auto;
  min-height: 0;
  gap: var(--sys-spacing-medium);
}

.candidate-join-flow {
  gap: var(--sys-spacing-small);
}

.no-match-hero__title,
.candidate-list__title,
.no-match-hero__body,
.inline-message {
  margin: 0;
}
.no-match-hero__title,
.candidate-list__title {
  @include mx.pu-font(section);
}

.no-match-hero__body {
  color: var(--sys-color-on-surface-variant);
  @include mx.pu-font(body);
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

.inline-message {
  @include mx.pu-font(support);
}

.inline-message--error {
  color: var(--sys-color-error);
}
</style>
