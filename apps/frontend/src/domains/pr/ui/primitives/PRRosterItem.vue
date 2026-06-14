<template>
  <component
    :is="rootComponent"
    v-bind="rootProps"
    class="pr-roster-item"
    :class="[
      `pr-roster-item--${props.variant}`,
      { 'pr-roster-item--link': hasLink },
    ]"
  >
    <div class="pr-roster-item__body">
      <div class="pr-roster-item__identity">
        <img
          v-if="props.avatarUrl"
          :src="props.avatarUrl"
          :alt="props.avatarAlt"
          class="pr-roster-item__avatar"
        />
        <div
          v-else
          class="pr-roster-item__avatar pr-roster-item__avatar--fallback"
          aria-hidden="true"
        >
          <span>{{ props.avatarFallback }}</span>
        </div>
        <span class="pr-roster-item__name">{{ props.displayName }}</span>
      </div>

      <div v-if="hasTags" class="pr-roster-item__tags">
        <PuTag
          v-if="props.isSelf && props.selfLabel"
          class="pr-roster-item__tag"
          :text="props.selfLabel"
          :variant="tagVariant"
          tone="secondary"
          shape="pill"
          size="xs"
        />
        <PuTag
          v-if="props.isCreator && props.creatorLabel"
          class="pr-roster-item__tag"
          :text="props.creatorLabel"
          :variant="tagVariant"
          tone="secondary"
          shape="pill"
          size="xs"
        />
      </div>
    </div>

    <PuTag
      v-if="props.variant === 'card'"
      class="pr-roster-item__state-tag"
      :text="props.stateLabel"
      tone="secondary"
      variant="soft"
      shape="pill"
      size="xs"
    />
    <span v-else class="pr-roster-item__state-text">{{
      props.stateLabel
    }}</span>
  </component>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, type RouteLocationRaw } from "vue-router";
import { PuTag } from "@partner-up-dev/design-web";

const props = withDefaults(
  defineProps<{
    displayName: string;
    avatarAlt: string;
    avatarFallback: string;
    stateLabel: string;
    avatarUrl?: string | null;
    isSelf?: boolean;
    isCreator?: boolean;
    selfLabel?: string;
    creatorLabel?: string;
    to?: RouteLocationRaw | null;
    variant?: "plain" | "card";
  }>(),
  {
    avatarUrl: null,
    isSelf: false,
    isCreator: false,
    selfLabel: "",
    creatorLabel: "",
    to: null,
    variant: "plain",
  },
);

const hasLink = computed(() => props.to !== null);
const rootComponent = computed(() => (hasLink.value ? RouterLink : "div"));
const rootProps = computed(() => (hasLink.value ? { to: props.to } : {}));
const hasTags = computed(
  () =>
    (props.isSelf && props.selfLabel.length > 0) ||
    (props.isCreator && props.creatorLabel.length > 0),
);
const tagVariant = computed(() => (props.variant === "card" ? "soft" : "plain"));
</script>

<style lang="scss" scoped>
.pr-roster-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--sys-spacing-small);
  color: inherit;
}

.pr-roster-item--plain {
  padding: var(--sys-spacing-small) 0;
}

.pr-roster-item--card {
  padding: var(--sys-spacing-small) var(--sys-spacing-medium);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-small);
  background: transparent;
}

.pr-roster-item--link {
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.pr-roster-item--plain.pr-roster-item--link {
  transition: background-color 160ms ease;

  &:hover {
    background: var(--sys-color-surface-container-low);
  }
}

.pr-roster-item--card.pr-roster-item--link {
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;

  &:hover {
    transform: translateY(-1px);
    border-color: var(--sys-color-primary);
    background: var(--sys-color-surface-container-low);
  }
}

.pr-roster-item__body {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
  min-width: 0;
}

.pr-roster-item__identity {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-small);
  min-width: 0;
}

.pr-roster-item__name {
  @include mx.pu-font(body);
  overflow-wrap: anywhere;
}

.pr-roster-item__avatar {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  object-fit: cover;
  flex-shrink: 0;
}

.pr-roster-item__avatar--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--sys-color-outline-variant);
  background: var(--sys-color-primary-container);
  color: var(--sys-color-on-primary-container);

  span {
    @include mx.pu-font(control);
  }
}

.pr-roster-item__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-xsmall);
}

.pr-roster-item__state-text {
  @include mx.pu-font(caption);
  align-self: center;
  color: var(--sys-color-on-surface-variant);
}

.pr-roster-item__tag,
.pr-roster-item__state-tag,
.pr-roster-item__state-text {
  flex-shrink: 0;
}

.pr-roster-item__state-tag {
  align-self: center;
  margin-left: auto;
}
</style>
