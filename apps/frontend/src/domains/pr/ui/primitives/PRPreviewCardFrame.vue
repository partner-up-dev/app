<template>
  <article v-bind="$attrs" class="pr-preview-card">
    <component
      :is="rootComponent"
      v-bind="rootProps"
      class="pr-preview-card__link"
      :class="{ 'pr-preview-card__link--button': mode === 'button' }"
      @click="emit('activate')"
    >
      <PuImg
        v-if="coverImage"
        class="pr-preview-card__cover"
        :src="coverImage"
        alt=""
        mode="aspectFill"
        :show-loading="false"
      />

      <div class="pr-preview-card__body">
        <div class="pr-preview-card__header">
          <div class="pr-preview-card__headline">
            <span class="pr-preview-card__title">
              {{ title }}
            </span>
          </div>
          <PRStatusBadge
            v-if="status"
            class="pr-preview-card__status"
            :status="status"
            size="sm"
            appearance="pill"
          />
        </div>

        <div class="pr-preview-card__meta">
          <span v-if="timeLabel" class="pr-preview-card__time">
            🕒 {{ timeLabel }}
          </span>
          <span v-if="placeLabel" class="pr-preview-card__location">
            {{ placeIcon }} {{ placeLabel }}
          </span>
          <span v-if="preferenceLabel" class="pr-preview-card__preference">
            🏷️ {{ preferenceLabel }}
          </span>
          <span v-if="partnerCountLabel" class="pr-preview-card__partners">
            👥 {{ partnerCountLabel }}
          </span>
        </div>
      </div>
    </component>

    <div v-if="hasActions" class="pr-preview-card__actions">
      <slot name="actions" />
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, useSlots } from "vue";
import { RouterLink } from "vue-router";
import { PuImg } from "@partner-up-dev/design-web";
import type { PRDisplayStatus } from "@/domains/pr/model/pr-display-status";
import PRStatusBadge from "@/domains/pr/ui/primitives/PRStatusBadge.vue";

const props = withDefaults(
  defineProps<{
    mode: "link" | "button";
    title: string;
    status?: PRDisplayStatus | null;
    timeLabel?: string | null;
    placeLabel?: string | null;
    placeIcon?: string;
    partnerCountLabel?: string | null;
    preferenceTags?: readonly string[];
    coverImage?: string | null;
    to?: string | null;
    disabled?: boolean;
  }>(),
  {
    status: null,
    timeLabel: null,
    placeLabel: null,
    placeIcon: "📍",
    partnerCountLabel: null,
    preferenceTags: () => [],
    coverImage: null,
    to: null,
    disabled: false,
  },
);

const emit = defineEmits<{
  activate: [];
}>();

const slots = useSlots();
const hasActions = computed(() => Boolean(slots.actions));
const rootComponent = computed(() => (props.mode === "link" ? RouterLink : "button"));
const rootProps = computed(() =>
  props.mode === "link"
    ? { to: props.to ?? "" }
    : { type: "button", disabled: props.disabled },
);

const toPreferenceDisplayLabel = (tag: string): string | null => {
  const normalized = tag.trim();
  if (!normalized) {
    return null;
  }

  const separatorIndex = normalized.search(/[:：]/);
  if (separatorIndex < 0) {
    return normalized;
  }

  const displayLabel = normalized.slice(separatorIndex + 1).trim();
  return displayLabel.length > 0 ? displayLabel : normalized;
};

const preferenceLabel = computed(
  () =>
    props.preferenceTags
      .map(toPreferenceDisplayLabel)
      .find((tag): tag is string => tag !== null) ?? null,
);
</script>

<style lang="scss" scoped>
.pr-preview-card {
  --pr-preview-card-radius: var(--sys-radius-medium);
  --pr-preview-card-body-padding-block: var(--sys-spacing-small);
  --pr-preview-card-body-padding-inline: var(--sys-spacing-medium);
  --pr-preview-card-header-gap: var(--sys-spacing-small);

  display: flex;
  flex-direction: column;
  border-radius: var(--pr-preview-card-radius);
  background: var(--sys-color-surface-container);
  overflow: hidden;
}

.pr-preview-card__link {
  display: block;
  color: inherit;
  text-decoration: none;
  transition: transform 0.15s ease;

  &:active {
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.pr-preview-card__link--button {
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;

  &:disabled {
    cursor: wait;
    opacity: 0.72;
  }
}

.pr-preview-card__cover {
  display: block;
  width: 100%;
  height: 108px;
}

.pr-preview-card__body {
  padding: var(--pr-preview-card-body-padding-block)
    var(--pr-preview-card-body-padding-inline);
}

.pr-preview-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.375rem;
  gap: var(--pr-preview-card-header-gap);
}

.pr-preview-card__headline {
  display: flex;
  flex-direction: column;
  gap: calc(var(--sys-spacing-xsmall) / 2);
  min-width: 0;
}

.pr-preview-card__title {
  @include mx.pu-font(section);
  overflow-wrap: anywhere;
}

.pr-preview-card__status {
  flex-shrink: 0;
}

.pr-preview-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-medium);
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
}

.pr-preview-card__actions {
  display: flex;
  flex-direction: row;
  gap: var(--sys-spacing-small);
  padding: 0 var(--sys-spacing-small) var(--sys-spacing-small);
}

.pr-preview-card__actions :deep(> *) {
  flex: 1 1 0;
}
</style>
