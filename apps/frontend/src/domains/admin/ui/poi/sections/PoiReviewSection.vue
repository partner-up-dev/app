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
          <PuTag
            v-if="selectedPoi"
            :tone="statusTagTone(selectedPoi.status)"
            :text="statusLabel(selectedPoi.status)"
            size="sm"
            variant="soft"
            shape="pill"
          />
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

          <PuFormItem
            :label="t('adminPois.rejectReasonLabel')"
            for-id="admin-pois-reject-reason"
          >
            <PuTextarea
              id="admin-pois-reject-reason"
              v-model="rejectReasonDraft"
              :placeholder="t('adminPois.rejectReasonPlaceholder')"
            />
          </PuFormItem>

          <div class="action-row">
            <PuButton
              shape="pill"
              tone="neutral" variant="outline"
              size="sm"

              :disabled="!canPublishPoi"
              :loading="isPublishingPoi"
              @click="emit('publish-poi')"
            >
              {{
                isPublishingPoi
                  ? t("adminPois.publishingPoi")
                  : t("adminPois.publishPoiAction")
              }}
            </PuButton>
            <PuButton
              shape="pill"
              tone="danger" variant="outline"
              size="sm"

              :disabled="!canRejectPoi"
              :loading="isRejectingPoi"
              @click="emit('reject-poi')"
            >
              {{
                isRejectingPoi
                  ? t("adminPois.rejectingPoi")
                  : t("adminPois.rejectPoiAction")
              }}
            </PuButton>
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
import {
  PuButton,
  PuFormItem,
  PuTag,
  PuTextarea,
} from "@partner-up-dev/design-web";

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

const statusTagTone = (
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

</style>
