<template>
  <PRPreviewCardFrame
    v-bind="$attrs"
    mode="link"
    :to="resolvedTo"
    :title="prTitle"
    :status="resolvedStatus"
    :time-label="timeLabelText"
    :place-label="resolvedPlaceLabel"
    :place-icon="resolvedPlaceIcon"
    :preference-tags="resolvedPreferenceTags"
    :partner-count-label="resolvedPartnerCountLabel"
    :cover-image="coverImage"
    @activate="emit('open-detail')"
  >
    <template v-if="hasActions" #actions>
      <slot name="actions" />
    </template>
  </PRPreviewCardFrame>
</template>

<script setup lang="ts">
import type { PRId } from "@partner-up-dev/backend";
import { computed, useSlots } from "vue";
import { usePRDetail } from "@/domains/pr/queries/usePRDetail";
import { prDetailPath } from "@/domains/pr/routing/routes";
import { resolvePRDisplayStatus } from "@/domains/pr/model/pr-display-status";
import PRPreviewCardFrame from "@/domains/pr/ui/primitives/PRPreviewCardFrame.vue";
import { buildRouteSummary } from "@/domains/route/model/route";
import { formatFriendlyTimeWindowLabel } from "@/shared/datetime/formatLocalDateTime";

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

const resolvedStatus = computed(() => {
  const detail = prDetail.value;
  if (!detail) return null;
  return resolvePRDisplayStatus(detail.status, detail.partnerSection.capacity);
});

const resolvedPlaceLabel = computed(
  () =>
    normalizeLabel(prDetail.value?.core.placeDisplayName) ??
    buildRouteSummary(prDetail.value?.core.route) ??
    normalizeLabel(prDetail.value?.core.location),
);

const resolvedPlaceIcon = computed(
  () => ((prDetail.value?.core.route?.length ?? 0) >= 2 ? "🧭" : "📍"),
);

const resolvedPreferenceTags = computed(() => prDetail.value?.core.preferences ?? []);

const timeLabelText = computed(() => {
  const explicit = normalizeLabel(props.timeLabel);
  if (explicit) {
    return explicit;
  }

  return formatFriendlyTimeWindowLabel(prDetail.value?.core.time ?? [null, null]);
});

const resolvedPartnerCountLabel = computed(() => {
  const current = prDetail.value?.partnerSection.capacity.current;
  const max = prDetail.value?.partnerSection.capacity.max;
  if (typeof current !== "number" && typeof max !== "number") {
    return null;
  }

  if (typeof current === "number" && typeof max === "number") {
    if (current === 0) {
      return String(max);
    }
    return `${current}/${max}`;
  }

  if (typeof current === "number") {
    return String(current);
  }

  return null;
});

const hasActions = computed(() => Boolean(slots.actions));
</script>
