<template>
  <div class="anchor-event-pending-preference-tag-list">
    <PuLoadingState
      v-if="preferenceTagsQuery.isLoading.value"
      :message="t('common.loading')"
    />

    <p v-else-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </p>

    <p v-else-if="pendingTags.length === 0" class="hint">
      {{ t("adminAnchorEvents.emptyPendingPreferenceTags") }}
    </p>

    <div v-else class="anchor-event-pending-preference-tag-list__items">
      <article
        v-for="tag in pendingTags"
        :key="tag.id"
        class="anchor-event-pending-preference-tag-list__item"
      >
        <div class="anchor-event-pending-preference-tag-list__summary">
          <p class="anchor-event-pending-preference-tag-list__label">
            {{ tag.label }}
          </p>
          <p class="hint">
            {{
              tag.description ||
              t("adminAnchorEvents.preferenceTagDescriptionEmpty")
            }}
          </p>
        </div>

        <div class="anchor-event-pending-preference-tag-list__actions">
          <Button
            appearance="pill"
            size="sm"
            type="button"
            :disabled="isModerating"
            @click="publishTag(tag.id)"
          >
            {{ t("adminAnchorEvents.publishPreferenceTagAction") }}
          </Button>
          <Button
            appearance="pill"
            tone="outline"
            size="sm"
            type="button"
            :disabled="isModerating"
            @click="rejectTag(tag.id)"
          >
            {{ t("adminAnchorEvents.rejectPreferenceTagAction") }}
          </Button>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Button from "@/shared/ui/actions/Button.vue";
import { PuLoadingState } from "@partner-up-dev/design-web";
import {
  useAdminAnchorEventPreferenceTags,
  usePublishAdminAnchorEventPreferenceTag,
  useRejectAdminAnchorEventPreferenceTag,
} from "@/domains/admin/queries/useAdminAnchorEventPreferenceTags";

const props = withDefaults(
  defineProps<{
    eventId: number | null;
    enabled?: boolean;
  }>(),
  {
    enabled: true,
  },
);

const { t } = useI18n();
const eventId = computed(() => props.eventId);
const isQueryEnabled = computed(() => props.enabled && props.eventId !== null);
const preferenceTagsQuery = useAdminAnchorEventPreferenceTags(
  eventId,
  isQueryEnabled,
);
const publishPreferenceTagMutation = usePublishAdminAnchorEventPreferenceTag();
const rejectPreferenceTagMutation = useRejectAdminAnchorEventPreferenceTag();

const pendingTags = computed(
  () => preferenceTagsQuery.data.value?.pendingTags ?? [],
);
const isModerating = computed(
  () =>
    publishPreferenceTagMutation.isPending.value ||
    rejectPreferenceTagMutation.isPending.value,
);
const errorMessage = computed(
  () =>
    preferenceTagsQuery.error.value?.message ||
    publishPreferenceTagMutation.error.value?.message ||
    rejectPreferenceTagMutation.error.value?.message ||
    null,
);

const publishTag = async (tagId: number): Promise<void> => {
  if (!props.enabled || props.eventId === null) {
    return;
  }

  try {
    await publishPreferenceTagMutation.mutateAsync({
      eventId: props.eventId,
      tagId,
    });
  } catch {
    // Mutation state drives the local error message.
  }
};

const rejectTag = async (tagId: number): Promise<void> => {
  if (!props.enabled || props.eventId === null) {
    return;
  }

  try {
    await rejectPreferenceTagMutation.mutateAsync({
      eventId: props.eventId,
      tagId,
    });
  } catch {
    // Mutation state drives the local error message.
  }
};
</script>

<style lang="scss" scoped>
.anchor-event-pending-preference-tag-list,
.anchor-event-pending-preference-tag-list__items,
.anchor-event-pending-preference-tag-list__item,
.anchor-event-pending-preference-tag-list__summary {
  display: flex;
  flex-direction: column;
}

.anchor-event-pending-preference-tag-list,
.anchor-event-pending-preference-tag-list__items,
.anchor-event-pending-preference-tag-list__item {
  gap: var(--sys-spacing-small);
}

.anchor-event-pending-preference-tag-list__summary {
  gap: var(--sys-spacing-xsmall);
}

.anchor-event-pending-preference-tag-list__item {
  padding-block: var(--sys-spacing-small);
  border-top: 1px solid var(--sys-color-outline-variant);
}

.anchor-event-pending-preference-tag-list__item:first-child {
  padding-top: 0;
  border-top: 0;
}

.anchor-event-pending-preference-tag-list__label {
  margin: 0;
  @include mx.pu-font(section);
}

.anchor-event-pending-preference-tag-list__actions {
  display: flex;
  gap: var(--sys-spacing-xsmall);
  flex-wrap: wrap;
}

.hint {
  margin: 0;
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

.error-message {
  margin: 0;
  @include mx.pu-font(body);
  color: var(--sys-color-error);
}
</style>
