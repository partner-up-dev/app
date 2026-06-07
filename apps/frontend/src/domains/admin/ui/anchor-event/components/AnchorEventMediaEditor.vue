<template>
  <div class="anchor-event-media-editor">
    <div class="field">
      <span class="field-label">{{ t("adminPR.eventCoverImageLabel") }}</span>
      <ImageUrlInput
        v-model="form.coverImage"
        v-model:uploading="coverUploading"
        input-id="admin-anchor-event-cover-image"
        purpose="anchor-event-cover"
        :placeholder="t('adminPR.eventImageUrlPlaceholder')"
        :upload-label="t('adminPR.uploadEventCoverImageAction')"
        :uploading-label="t('adminPR.uploadingEventImage')"
        :preview-alt="t('adminPR.eventCoverImagePreviewAlt')"
      />
    </div>

    <div class="field">
      <span class="field-label">{{ t("adminPR.eventBetaGroupQrCodeLabel") }}</span>
      <ImageUrlInput
        v-model="form.betaGroupQrCode"
        v-model:uploading="betaGroupQrUploading"
        input-id="admin-anchor-event-beta-group-qr"
        purpose="anchor-event-beta-group-qr"
        :placeholder="t('adminPR.eventImageUrlPlaceholder')"
        :upload-label="t('adminPR.uploadEventBetaGroupQrCodeAction')"
        :uploading-label="t('adminPR.uploadingEventImage')"
        :preview-alt="t('adminPR.eventBetaGroupQrCodePreviewAlt')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import ImageUrlInput from "@/shared/upload/ImageUrlInput.vue";
import type { AnchorEventEditorForm } from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";

const form = defineModel<AnchorEventEditorForm>({ required: true });
const coverUploading = defineModel<boolean>("coverUploading", { required: true });
const betaGroupQrUploading = defineModel<boolean>("betaGroupQrUploading", {
  required: true,
});
const { t } = useI18n();
</script>

<style lang="scss" scoped>
.anchor-event-media-editor,
.field {
  display: flex;
  flex-direction: column;
}

.anchor-event-media-editor {
  gap: var(--sys-spacing-small);
}

.field {
  gap: var(--sys-spacing-xsmall);
}

.field-label {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
}
</style>
