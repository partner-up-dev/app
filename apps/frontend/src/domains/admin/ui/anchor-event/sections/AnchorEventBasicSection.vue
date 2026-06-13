<template>
  <section
    id="anchor-event-basic"
    class="anchor-event-basic-section"
    data-testid="admin-anchor-event.section.basic"
  >
    <BentoLayout>
      <BentoItem :title="t('adminAnchorEvents.activityInfoTitle')" span="full">
        <template #actions>
          <PuButton
            shape="pill"
            size="sm"

            :disabled="saveDisabled"
            @click="$emit('save')"
          >
            {{ saveLabel }}
          </PuButton>
        </template>

        <AnchorEventDetailsEditor v-model="form" />
      </BentoItem>

      <BentoItem :title="t('adminPR.eventCoverImageLabel')" span="full">
        <AnchorEventMediaEditor
          v-model="form"
          v-model:cover-uploading="coverUploading"
          v-model:beta-group-qr-uploading="betaGroupQrUploading"
        />
      </BentoItem>

      <BentoItem
        :title="t('adminAnchorEvents.participationDefaultsTitle')"
        span="full"
      >
        <AnchorEventCapacityDefaultsEditor
          v-model="form"
          :validation-message="boundsValidationMessage"
        />
      </BentoItem>
    </BentoLayout>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import BentoLayout from "@/domains/admin/ui/layout/BentoLayout.vue";
import AnchorEventCapacityDefaultsEditor from "@/domains/admin/ui/anchor-event/components/AnchorEventCapacityDefaultsEditor.vue";
import AnchorEventDetailsEditor from "@/domains/admin/ui/anchor-event/components/AnchorEventDetailsEditor.vue";
import AnchorEventMediaEditor from "@/domains/admin/ui/anchor-event/components/AnchorEventMediaEditor.vue";
import type { AnchorEventEditorForm } from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";
import { PuButton } from "@partner-up-dev/design-web";

defineProps<{
  saveLabel: string;
  saveDisabled: boolean;
  boundsValidationMessage: string | null;
}>();

defineEmits<{
  save: [];
}>();

const form = defineModel<AnchorEventEditorForm>({ required: true });
const coverUploading = defineModel<boolean>("coverUploading", { required: true });
const betaGroupQrUploading = defineModel<boolean>("betaGroupQrUploading", {
  required: true,
});
const { t } = useI18n();
</script>

<style lang="scss" scoped>
.anchor-event-basic-section {
  min-width: 0;
}
</style>
