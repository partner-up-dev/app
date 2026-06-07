<template>
  <BentoLayout>
    <BentoItem
      id="poi-review"
      :title="`${t('adminCommon.navPoiReview')} · ${selectedPoi?.name ?? selectedPoiId ?? '-'}`"
      span="full"
      data-testid="admin-pois.section.review"
    >
      <div class="stack">
        <div class="section-header">
          <Chip v-if="selectedPoi" :tone="statusChipTone(selectedPoi.status)" size="sm">
            {{ statusLabel(selectedPoi.status) }}
          </Chip>
        </div>

        <div v-if="selectedPoi === null" class="hint">
          {{ t("adminPois.poiPlaceholder") }}
        </div>

        <template v-else>
          <p v-if="selectedPoi.submittedByUserId" class="hint">
            {{
              t("adminPois.submittedBy", {
                userId: selectedPoi.submittedByUserId,
              })
            }}
          </p>
          <p v-if="selectedPoi.reviewedAt" class="hint">
            {{ t("adminPois.reviewedAt", { time: selectedReviewedAt }) }}
          </p>

          <label class="field">
            <span class="field-label">{{ t("adminPois.rejectReasonLabel") }}</span>
            <textarea
              v-model="rejectReasonDraft"
              class="field-input field-textarea"
              :placeholder="t('adminPois.rejectReasonPlaceholder')"
            ></textarea>
          </label>

          <div class="action-row">
            <Button
              appearance="pill"
              tone="outline"
              size="sm"
              type="button"
              :disabled="!canPublishPoi"
              :loading="isPublishingPoi"
              @click="emit('publish-poi')"
            >
              {{
                isPublishingPoi
                  ? t("adminPois.publishingPoi")
                  : t("adminPois.publishPoiAction")
              }}
            </Button>
            <Button
              appearance="pill"
              tone="danger"
              size="sm"
              type="button"
              :disabled="!canRejectPoi"
              :loading="isRejectingPoi"
              @click="emit('reject-poi')"
            >
              {{
                isRejectingPoi
                  ? t("adminPois.rejectingPoi")
                  : t("adminPois.rejectPoiAction")
              }}
            </Button>
          </div>
        </template>
      </div>
    </BentoItem>
  </BentoLayout>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { AdminPoisResponse } from "@/domains/admin/queries/useAdminPoiManagement";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import BentoLayout from "@/domains/admin/ui/layout/BentoLayout.vue";
import Button from "@/shared/ui/actions/Button.vue";
import Chip from "@/shared/ui/display/Chip.vue";

type PoiRecord = NonNullable<AdminPoisResponse>[number];
type PoiStatus = PoiRecord["status"];

defineProps<{
  selectedPoiId: number | null;
  selectedPoi: PoiRecord | null;
  selectedReviewedAt: string;
  canPublishPoi: boolean;
  canRejectPoi: boolean;
  isPublishingPoi: boolean;
  isRejectingPoi: boolean;
}>();

const emit = defineEmits<{
  "publish-poi": [];
  "reject-poi": [];
}>();

const rejectReasonDraft = defineModel<string>("rejectReasonDraft", {
  required: true,
});

const { t } = useI18n();

const statusLabel = (status: PoiStatus): string => {
  switch (status) {
    case "PENDING":
      return t("adminPois.statusPending");
    case "PUBLISHED":
      return t("adminPois.statusPublished");
    case "REJECTED":
      return t("adminPois.statusRejected");
  }
};

const statusChipTone = (
  status: PoiStatus,
): "primary" | "secondary" | "danger" =>
  status === "PUBLISHED"
    ? "primary"
    : status === "REJECTED"
      ? "danger"
      : "secondary";
</script>

<style lang="scss" scoped>
.stack {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.hint {
  @include mx.pu-font(body);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

.section-header,
.action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.field-label {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
}

.field-input {
  width: 100%;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}

.field-textarea {
  min-height: 5rem;
  resize: vertical;
}
</style>
