<template>
  <div class="anchor-event-media-editor">
    <PuFormItem
      :label="t('adminPR.eventCoverImageLabel')"
      for-id="admin-anchor-event-cover-image"
    >
      <PuFileUpload
        id="admin-anchor-event-cover-image"
        v-model="coverUploadValue"
        mode="both"
        layout="panel"
        :accept="IMAGE_UPLOAD_ACCEPT"
        :placeholder="t('adminPR.eventImageUrlPlaceholder')"
        :url-placeholder="t('adminPR.eventImageUrlPlaceholder')"
        :choose-label="t('adminPR.uploadEventCoverImageAction')"
        :drop-label="t('adminPR.uploadEventCoverImageAction')"
        :replace-label="t('adminPR.uploadEventCoverImageAction')"
        @add="handleCoverUploadAdd"
        @remove="handleCoverUploadRemove"
        @reject="handleCoverUploadReject"
        @update:model-value="handleCoverUploadUpdate"
      />
      <PuInlineNotice
        v-if="coverUploadError"
        tone="error"
        :message="coverUploadError"
      />
    </PuFormItem>

    <PuFormItem
      :label="t('adminPR.eventBetaGroupQrCodeLabel')"
      for-id="admin-anchor-event-beta-group-qr"
    >
      <PuFileUpload
        id="admin-anchor-event-beta-group-qr"
        v-model="betaGroupQrUploadValue"
        mode="both"
        layout="panel"
        :accept="IMAGE_UPLOAD_ACCEPT"
        :placeholder="t('adminPR.eventImageUrlPlaceholder')"
        :url-placeholder="t('adminPR.eventImageUrlPlaceholder')"
        :choose-label="t('adminPR.uploadEventBetaGroupQrCodeAction')"
        :drop-label="t('adminPR.uploadEventBetaGroupQrCodeAction')"
        :replace-label="t('adminPR.uploadEventBetaGroupQrCodeAction')"
        @add="handleBetaGroupQrUploadAdd"
        @remove="handleBetaGroupQrUploadRemove"
        @reject="handleBetaGroupQrUploadReject"
        @update:model-value="handleBetaGroupQrUploadUpdate"
      />
      <PuInlineNotice
        v-if="betaGroupQrUploadError"
        tone="error"
        :message="betaGroupQrUploadError"
      />
    </PuFormItem>
  </div>
</template>

<script setup lang="ts">
import { watch } from "vue";
import { useI18n } from "vue-i18n";
import type { AnchorEventEditorForm } from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";
import {
  PuFileUpload,
  PuFormItem,
  PuInlineNotice,
} from "@partner-up-dev/design-web";
import {
  IMAGE_UPLOAD_ACCEPT,
  useSingleImageUploadField,
} from "@/shared/upload/useDesignWebImageUpload";

const form = defineModel<AnchorEventEditorForm>({ required: true });
const coverUploading = defineModel<boolean>("coverUploading", { required: true });
const betaGroupQrUploading = defineModel<boolean>("betaGroupQrUploading", {
  required: true,
});
const { t } = useI18n();

const {
  uploadValue: coverUploadValue,
  isUploading: isCoverUploading,
  errorMessage: coverUploadError,
  handleUpdate: handleCoverUploadUpdate,
  handleAdd: handleCoverUploadAdd,
  handleRemove: handleCoverUploadRemove,
  handleReject: handleCoverUploadReject,
} = useSingleImageUploadField({
  getUrl: () => form.value.coverImage,
  setUrl: (url) => {
    form.value.coverImage = url;
  },
  purpose: "anchor-event-cover",
  uploadingMessage: t("adminPR.uploadingEventImage"),
});

const {
  uploadValue: betaGroupQrUploadValue,
  isUploading: isBetaGroupQrUploading,
  errorMessage: betaGroupQrUploadError,
  handleUpdate: handleBetaGroupQrUploadUpdate,
  handleAdd: handleBetaGroupQrUploadAdd,
  handleRemove: handleBetaGroupQrUploadRemove,
  handleReject: handleBetaGroupQrUploadReject,
} = useSingleImageUploadField({
  getUrl: () => form.value.betaGroupQrCode,
  setUrl: (url) => {
    form.value.betaGroupQrCode = url;
  },
  purpose: "anchor-event-beta-group-qr",
  uploadingMessage: t("adminPR.uploadingEventImage"),
});

watch(
  isCoverUploading,
  (value) => {
    coverUploading.value = value;
  },
  { immediate: true },
);

watch(
  isBetaGroupQrUploading,
  (value) => {
    betaGroupQrUploading.value = value;
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.anchor-event-media-editor {
  display: flex;
  flex-direction: column;
}

.anchor-event-media-editor {
  gap: var(--sys-spacing-small);
}
</style>
