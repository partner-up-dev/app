<template>
  <section
    id="anchor-event-basic"
    class="anchor-event-basic-section"
    data-testid="admin-anchor-event.section.basic"
  >
    <BentoLayout>
      <BentoItem :title="t('adminAnchorEvents.activityInfoTitle')" span="full">
        <template #actions>
          <Button
            appearance="pill"
            size="sm"
            type="button"
            :disabled="saveDisabled"
            @click="$emit('save')"
          >
            {{ saveLabel }}
          </Button>
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
import Button from "@/shared/ui/actions/Button.vue";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import BentoLayout from "@/domains/admin/ui/layout/BentoLayout.vue";
import AnchorEventCapacityDefaultsEditor from "@/domains/admin/ui/anchor-event/components/AnchorEventCapacityDefaultsEditor.vue";
import AnchorEventDetailsEditor from "@/domains/admin/ui/anchor-event/components/AnchorEventDetailsEditor.vue";
import AnchorEventMediaEditor from "@/domains/admin/ui/anchor-event/components/AnchorEventMediaEditor.vue";
import type { AnchorEventEditorForm } from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";

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
