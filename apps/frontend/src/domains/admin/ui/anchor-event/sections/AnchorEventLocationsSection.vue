<template>
  <section
    id="anchor-event-locations"
    class="anchor-event-locations-section"
    data-testid="admin-anchor-event.section.locations"
  >
    <BentoLayout>
      <BentoItem :title="t('adminAnchorEvents.locationPoolsTitle')" span="full">
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

        <AnchorEventPlacePoolEditor v-model="form" />
      </BentoItem>

      <BentoItem :title="t('adminPR.eventDefaultMeetingPointTitle')">
        <AnchorEventDefaultMeetingPointEditor v-model="form" />
      </BentoItem>

      <BentoItem
        v-if="form.placePoolMode === 'location'"
        :title="t('adminPR.eventLocationMeetingPointsTitle')"
      >
        <AnchorEventLocationMeetingPointsEditor v-model="form" />
      </BentoItem>
    </BentoLayout>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import BentoLayout from "@/domains/admin/ui/layout/BentoLayout.vue";
import AnchorEventDefaultMeetingPointEditor from "@/domains/admin/ui/anchor-event/components/AnchorEventDefaultMeetingPointEditor.vue";
import AnchorEventLocationMeetingPointsEditor from "@/domains/admin/ui/anchor-event/components/AnchorEventLocationMeetingPointsEditor.vue";
import AnchorEventPlacePoolEditor from "@/domains/admin/ui/anchor-event/components/AnchorEventPlacePoolEditor.vue";
import type { AnchorEventEditorForm } from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";
import { PuButton } from "@partner-up-dev/design-web";

defineProps<{
  saveLabel: string;
  saveDisabled: boolean;
}>();

defineEmits<{
  save: [];
}>();

const form = defineModel<AnchorEventEditorForm>({ required: true });
const { t } = useI18n();
</script>

<style lang="scss" scoped>
.anchor-event-locations-section {
  min-width: 0;
}
</style>
