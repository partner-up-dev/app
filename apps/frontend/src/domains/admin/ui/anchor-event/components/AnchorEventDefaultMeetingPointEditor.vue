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
      <PuInput
        id="anchor-event-meeting-point-image-url"
        v-model="form.meetingPointImageUrl"
        native-type="url"
      />
    </PuFormItem>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { AnchorEventEditorForm } from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";
import { PuFormItem, PuInput, PuTextarea } from "@partner-up-dev/design-web";

const form = defineModel<AnchorEventEditorForm>({ required: true });
const { t } = useI18n();
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
