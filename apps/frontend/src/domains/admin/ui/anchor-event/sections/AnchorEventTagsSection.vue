<template>
  <section
    id="anchor-event-tags"
    class="anchor-event-tags-section"
    data-testid="admin-anchor-event.section.tags"
  >
    <BentoLayout>
      <BentoItem
        v-if="!hasEditableEvent"
        :title="t('adminAnchorEvents.preferenceTagsTitle')"
        :description="t('adminAnchorEvents.preferenceTagsDescription')"
        span="full"
      >
        <p class="hint">
          {{ t("adminAnchorEvents.selectEventForPreferenceTagsHint") }}
        </p>
      </BentoItem>

      <template v-else>
        <BentoItem
          :title="t('adminAnchorEvents.preferenceTagsTitle')"
          :description="t('adminAnchorEvents.preferenceTagsDescription')"
          span="full"
        >
          <template #actions>
            <Button
              appearance="pill"
              tone="outline"
              size="sm"
              type="button"
              :disabled="isPoolSaving"
              @click="addPreferenceTag"
            >
              {{ t("adminAnchorEvents.addPreferenceTagAction") }}
            </Button>
            <Button
              appearance="pill"
              size="sm"
              type="button"
              :loading="isPoolSaving"
              @click="savePreferenceTags"
            >
              {{ t("adminAnchorEvents.savePreferenceTagsAction") }}
            </Button>
          </template>

          <AnchorEventPreferenceTagPoolEditor
            ref="preferenceTagPoolEditor"
            :event-id="eventId"
            :enabled="hasEditableEvent"
          />
        </BentoItem>

        <BentoItem
          :title="t('adminAnchorEvents.pendingPreferenceTagsTitle')"
          span="full"
        >
          <AnchorEventPendingPreferenceTagsContent
            :event-id="eventId"
            :enabled="hasEditableEvent"
          />
        </BentoItem>
      </template>
    </BentoLayout>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import Button from "@/shared/ui/actions/Button.vue";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import BentoLayout from "@/domains/admin/ui/layout/BentoLayout.vue";
import AnchorEventPendingPreferenceTagsContent from "@/domains/admin/ui/anchor-event/components/AnchorEventPendingPreferenceTagsContent.vue";
import AnchorEventPreferenceTagPoolEditor from "@/domains/admin/ui/anchor-event/components/AnchorEventPreferenceTagPoolEditor.vue";

type PreferenceTagPoolEditorExposed = {
  addRow: () => void;
  save: () => Promise<void>;
  isSaving: boolean;
};

const props = withDefaults(
  defineProps<{
    eventId: number | null;
    disabled?: boolean;
  }>(),
  {
    disabled: false,
  },
);

const { t } = useI18n();
const preferenceTagPoolEditor = ref<PreferenceTagPoolEditorExposed | null>(null);

const hasEditableEvent = computed(
  () => props.eventId !== null && !props.disabled,
);
const isPoolSaving = computed(
  () => preferenceTagPoolEditor.value?.isSaving ?? false,
);

const addPreferenceTag = (): void => {
  preferenceTagPoolEditor.value?.addRow();
};

const savePreferenceTags = (): void => {
  void preferenceTagPoolEditor.value?.save();
};
</script>

<style lang="scss" scoped>
.anchor-event-tags-section {
  min-width: 0;
}

.hint {
  margin: 0;
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}
</style>
