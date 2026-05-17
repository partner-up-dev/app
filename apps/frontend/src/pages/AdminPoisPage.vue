<template>
  <AdminPageScaffold class="page">
    <template #navigation>
      <AdminNavigationPanel show-logout @logout="logout" />
    </template>

    <template #actions>
      <template v-if="activeAdminSection === 'poi-basic'">
        <Button
          appearance="pill"
          tone="outline"
          size="sm"
          type="button"
          :disabled="isCreatingPoi || !canCreatePoi"
          @click="handleCreatePoi"
        >
          {{
            isCreatingPoi
              ? t("adminPois.creatingPoi")
              : t("adminPois.createPoiAction")
          }}
        </Button>

        <Button
          appearance="pill"
          size="sm"
          type="button"
          :disabled="selectedPoiId === null || isSavingPoi"
          @click="handleSavePoi"
        >
          {{
            isSavingPoi ? t("adminPois.savingPoi") : t("adminPois.savePoiAction")
          }}
        </Button>
      </template>
    </template>

    <template #rail>
      <PoiSelectorRail v-model="selectedPoiIdRaw" :pois="pois" />
    </template>

    <template #main>
      <div class="stack">
        <LoadingIndicator
          v-if="poisQuery.isLoading.value"
          :message="t('common.loading')"
        />
        <ErrorToast v-else-if="pageError" :message="pageError.message" persistent />

        <section v-else-if="pois.length === 0" class="empty-panel">
          {{ t("adminPois.emptyPois") }}
        </section>

        <template v-else>
          <PoiBasicSection
            v-if="activeAdminSection === 'poi-basic'"
            v-model:new-poi-name="newPoiName"
            v-model:manual-gallery-url="manualGalleryUrl"
            v-model:is-uploading-gallery-image="isUploadingGalleryImage"
            v-model:selected-poi-full-address="selectedPoiFullAddress"
            v-model:selected-poi-cap-text="selectedPoiCapText"
            v-model:selected-poi-meeting-point-description="selectedPoiMeetingPointDescription"
            v-model:selected-poi-meeting-point-image-url="selectedPoiMeetingPointImageUrl"
            :selected-poi-id="selectedPoiId"
            :selected-poi-gallery="selectedPoiGallery"
            :selected-poi-coordinate-text="selectedPoiCoordinateText"
            :selected-poi-has-coordinate="selectedPoiHasCoordinate"
            :selected-poi-picker-location="selectedPoiPickerLocation"
            :selected-poi-availability-rules="selectedPoiAvailabilityRules"
            :weekday-options="weekdayOptions"
            @add-manual-url="handleAddManualUrl"
            @gallery-uploaded="handleGalleryUploaded"
            @remove-gallery-image="handleRemoveGalleryImage"
            @pick-location="handlePickPoiLocation"
            @clear-coordinates="handleClearPoiCoordinates"
            @add-availability-rule="handleAddAvailabilityRule"
            @remove-availability-rule="handleRemoveAvailabilityRule"
            @mark-dirty="markSelectedPoiDirty"
          />

          <PoiReviewSection
            v-if="activeAdminSection === 'poi-review'"
            v-model:reject-reason-draft="rejectReasonDraft"
            :selected-poi-id="selectedPoiId"
            :selected-poi="selectedPoi"
            :selected-reviewed-at="selectedReviewedAt"
            :can-publish-poi="canPublishPoi"
            :can-reject-poi="canRejectPoi"
            :is-publishing-poi="isPublishingPoi"
            :is-rejecting-poi="isRejectingPoi"
            @publish-poi="handlePublishPoi"
            @reject-poi="handleRejectPoi"
          />
        </template>
      </div>
    </template>
  </AdminPageScaffold>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import AdminPageScaffold from "@/domains/admin/ui/layout/AdminPageScaffold.vue";
import AdminNavigationPanel from "@/domains/admin/ui/navigation/AdminNavigationPanel.vue";
import PoiSelectorRail from "@/domains/admin/ui/poi/components/PoiSelectorRail.vue";
import PoiBasicSection from "@/domains/admin/ui/poi/sections/PoiBasicSection.vue";
import PoiReviewSection from "@/domains/admin/ui/poi/sections/PoiReviewSection.vue";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";
import { useAdminNavigationSection } from "@/domains/admin/use-cases/useAdminNavigationSection";
import { useAdminPoiManagementWorkspace } from "@/domains/admin/use-cases/poi/useAdminPoiManagementWorkspace";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import Button from "@/shared/ui/actions/Button.vue";

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const activeAdminSection = useAdminNavigationSection("poi-basic", [
  "poi-basic",
  "poi-review",
] as const);
const {
  poisQuery,
  selectedPoiIdRaw,
  newPoiName,
  rejectReasonDraft,
  pois,
  selectedPoiId,
  selectedPoi,
  manualGalleryUrl,
  isUploadingGalleryImage,
  selectedPoiGallery,
  selectedPoiFullAddress,
  selectedPoiCoordinateText,
  selectedPoiHasCoordinate,
  selectedPoiPickerLocation,
  selectedPoiCapText,
  selectedPoiMeetingPointDescription,
  selectedPoiMeetingPointImageUrl,
  selectedPoiAvailabilityRules,
  markSelectedPoiDirty,
  handleAddManualUrl,
  handleGalleryUploaded,
  handleRemoveGalleryImage,
  handlePickPoiLocation,
  handleClearPoiCoordinates,
  handleAddAvailabilityRule,
  handleRemoveAvailabilityRule,
  weekdayOptions,
  canCreatePoi,
  isCreatingPoi,
  isSavingPoi,
  isPublishingPoi,
  isRejectingPoi,
  canPublishPoi,
  canRejectPoi,
  selectedReviewedAt,
  pageError,
  handleCreatePoi,
  handleSavePoi,
  handlePublishPoi,
  handleRejectPoi,
} = useAdminPoiManagementWorkspace(isAdmin);
</script>

<style lang="scss" scoped>
.stack {
  display: flex;
  flex-direction: column;
}

.stack {
  gap: var(--sys-spacing-medium);
}

.empty-panel {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.empty-panel {
  padding: var(--sys-spacing-large);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-large);
  background: var(--sys-color-surface-container);
}
</style>
