<template>
  <div class="anchor-event-default-meeting-point-editor">
    <PuFormItem
      :label="t('adminPR.eventMeetingPointDescriptionLabel')"
      for-id="anchor-event-meeting-point-description"
    >
      <PuTextarea
        id="anchor-event-meeting-point-description"
        v-model="form.meetingPointDescription"
      />
    </PuFormItem>

    <PuFormItem
      :label="t('adminPR.eventMeetingPointImageUrlLabel')"
      for-id="anchor-event-meeting-point-image-url"
    >
      <PuFileUpload
        id="anchor-event-meeting-point-image-url"
        v-model="meetingPointImageUploadValue"
        mode="url"
        layout="inline"
        :url-placeholder="t('adminPR.eventImageUrlPlaceholder')"
        @add="handleMeetingPointImageAdd"
        @remove="handleMeetingPointImageRemove"
        @reject="handleMeetingPointImageReject"
        @update:model-value="handleMeetingPointImageUpdate"
      />
      <PuInlineNotice
        v-if="meetingPointImageError"
        tone="error"
        :message="meetingPointImageError"
      />
    </PuFormItem>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { AnchorEventEditorForm } from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";
import { imageUploadItemFromUrl } from "@/shared/upload/useDesignWebImageUpload";
import {
  PuFileUpload,
  PuFormItem,
  PuInlineNotice,
  PuTextarea,
  type PuFileUploadItem,
  type PuFileUploadRejection,
  type PuFileUploadValue,
} from "@partner-up-dev/design-web";

const form = defineModel<AnchorEventEditorForm>({ required: true });
const { t } = useI18n();
const meetingPointImageError = ref<string | null>(null);

const meetingPointImageUploadValue = computed<PuFileUploadValue>({
  get: () => {
    const imageUrl = form.value.meetingPointImageUrl.trim();
    return imageUrl ? imageUploadItemFromUrl(imageUrl) : null;
  },
  set: (value) => {
    form.value.meetingPointImageUrl =
      value?.source === "url" && value.url ? value.url : "";
  },
});

const handleMeetingPointImageUpdate = (
  value: PuFileUploadValue,
): void => {
  meetingPointImageUploadValue.value = value;
  meetingPointImageError.value = null;
};

const handleMeetingPointImageAdd = (item: PuFileUploadItem): void => {
  if (item.source === "url" && item.url) {
    form.value.meetingPointImageUrl = item.url;
    meetingPointImageError.value = null;
  }
};

const handleMeetingPointImageRemove = (): void => {
  form.value.meetingPointImageUrl = "";
  meetingPointImageError.value = null;
};

const handleMeetingPointImageReject = (
  rejections: PuFileUploadRejection[],
): void => {
  meetingPointImageError.value = rejections[0]?.message ?? null;
};
</script>

<style lang="scss" scoped>
.anchor-event-default-meeting-point-editor {
  display: flex;
  flex-direction: column;
}

.anchor-event-default-meeting-point-editor {
  gap: var(--sys-spacing-small);
}
</style>
