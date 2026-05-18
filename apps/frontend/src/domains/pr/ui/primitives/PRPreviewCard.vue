<template>
  <article v-bind="$attrs" class="pr-preview-card">
    <RouterLink
      :to="resolvedTo"
      class="pr-preview-card__link"
      @click="emit('open-detail')"
    >
      <div
        v-if="coverImage"
        class="pr-preview-card__cover"
        :style="{ backgroundImage: `url(${coverImage})` }"
      />

      <div class="pr-preview-card__content">
        <div class="pr-preview-card__header">
          <div class="pr-preview-card__headline">
            <span class="pr-preview-card__title">
              {{ prTitle }}
            </span>
          </div>
          <PRStatusBadge
            v-if="resolvedStatus"
            class="pr-preview-card__status"
            :status="resolvedStatus"
            size="sm"
            appearance="pill"
          />
        </div>

        <div class="pr-preview-card__meta">
          <span v-if="timeLabelText" class="pr-preview-card__time">
            🕒 {{ timeLabelText }}
          </span>
          <span v-if="resolvedPlaceLabel" class="pr-preview-card__location">
            {{ resolvedPlaceIcon }} {{ resolvedPlaceLabel }}
          </span>
          <span v-if="resolvedPartnerCountLabel" class="pr-preview-card__partners">
            👥 {{ resolvedPartnerCountLabel }}
          </span>
        </div>
      </div>
    </RouterLink>

    <div v-if="hasActions" class="pr-preview-card__actions">
      <slot name="actions" />
    </div>
  </article>
</template>

<script setup lang="ts">
import type { PRId } from "@partner-up-dev/backend";
import { computed, useSlots } from "vue";
import { RouterLink } from "vue-router";
import { usePRDetail } from "@/domains/pr/queries/usePRDetail";
import { prDetailPath } from "@/domains/pr/routing/routes";
import PRStatusBadge from "@/domains/pr/ui/primitives/PRStatusBadge.vue";
import { buildRouteSummary } from "@/domains/route/model/route";
import { formatLocalDateTimeValue } from "@/shared/datetime/formatLocalDateTime";

const props = withDefaults(
  defineProps<{
    prId: PRId;
    coverImage?: string | null;
    timeLabel?: string | null;
    to?: string | null;
  }>(),
  {
    coverImage: null,
    timeLabel: null,
    to: null,
  },
);

const emit = defineEmits<{
  "open-detail": [];
}>();

const slots = useSlots();
const prId = computed(() => props.prId);
const { data: prDetail } = usePRDetail(prId);

const normalizeLabel = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
};

const resolvedTo = computed(() => props.to ?? prDetailPath(props.prId));

const prTitle = computed(() => {
  return (
    normalizeLabel(prDetail.value?.title) ??
    normalizeLabel(prDetail.value?.core.type) ??
    `#${props.prId}`
  );
});

const resolvedStatus = computed(() => prDetail.value?.status ?? null);

const resolvedPlaceLabel = computed(
  () =>
    normalizeLabel(prDetail.value?.core.placeDisplayName) ??
    buildRouteSummary(prDetail.value?.core.route) ??
    normalizeLabel(prDetail.value?.core.location),
);

const resolvedPlaceIcon = computed(
  () => ((prDetail.value?.core.route?.length ?? 0) >= 2 ? "🧭" : "📍"),
);

const timeLabelText = computed(() => {
  const explicit = normalizeLabel(props.timeLabel);
  if (explicit) {
    return explicit;
  }

  const startAt = prDetail.value?.core.time[0] ?? null;
  return formatLocalDateTimeValue(startAt);
});

const resolvedPartnerCountLabel = computed(() => {
  const current = prDetail.value?.partnerSection.capacity.current;
  const max = prDetail.value?.partnerSection.capacity.max;
  if (typeof current !== "number" && typeof max !== "number") {
    return null;
  }

  if (typeof current === "number" && typeof max === "number") {
    return `${current}/${max}`;
  }

  if (typeof current === "number") {
    return String(current);
  }

  return null;
});

const hasActions = computed(() => Boolean(slots.actions));
</script>

<style lang="scss" scoped>
.pr-preview-card {
  display: flex;
  flex-direction: column;
  border-radius: var(--dcs-pr-preview-card-radius);
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

.pr-preview-card__cover {
  width: 100%;
  height: 108px;
  background-size: cover;
  background-position: center;
}

.pr-preview-card__content {
  padding: var(--dcs-pr-preview-card-content-padding-block)
    var(--dcs-pr-preview-card-content-padding-inline);
}

.pr-preview-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.375rem;
  gap: var(--dcs-pr-preview-card-header-gap);
}

.pr-preview-card__headline {
  display: flex;
  flex-direction: column;
  gap: calc(var(--sys-spacing-xsmall) / 2);
  min-width: 0;
}

.pr-preview-card__title {
  @include mx.pu-font(title-small);
  overflow-wrap: anywhere;
}

.pr-preview-card__status {
  flex-shrink: 0;
}

.pr-preview-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-medium);
  @include mx.pu-font(label-medium);
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
