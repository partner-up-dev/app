<template>
  <SurfaceCard v-bind="$attrs" as="section" class="pr-facts-card" gap="sm">
    <LoadingIndicator v-if="isLoading" :message="t('common.loading')" />
    <ErrorToast v-else-if="error" :message="error.message" persistent />

    <template v-else-if="prDetail">
      <h2 class="facts-title">活动信息</h2>

      <section v-if="showLocationSection" class="facts-entry">
        <Button
          v-if="interactive && locationGalleryAvailable"
          class="facts-entry-button"
          tone="ghost"
          block
          @click="showLocationGalleryModal = true"
        >
          <span class="facts-entry-button__content">
            <span class="facts-entry-button__label">{{
              t("prCard.location")
            }}</span>
            <span class="facts-entry-button__trailing">
              <span class="facts-entry-button__action">
                {{ t("prCard.viewLocationImages") }}
              </span>
              <span
                class="facts-entry-button__icon i-mdi-chevron-right"
                aria-hidden="true"
              />
            </span>
          </span>
        </Button>

        <InfoRow v-else :label="t('prCard.location')">
          {{ locationDisplayText }}
        </InfoRow>

        <p
          v-if="interactive && locationGalleryAvailable"
          class="facts-entry__value"
        >
          {{ locationDisplayText }}
        </p>
      </section>

      <section
        v-if="routeAvailable"
        class="facts-entry"
        data-testid="pr-detail.route"
      >
        <InfoRowAction
          v-if="interactive"
          :label="t('prCard.route')"
          :value="t('prCard.viewRouteMap')"
          :aria-label="
            t('prCard.viewRouteMapAria', {
              route: routeDisplayText,
            })
          "
          @click="showRouteMapModal = true"
        />

        <InfoRow v-else :label="t('prCard.route')">
          {{ routeDisplayText }}
        </InfoRow>

        <RoutePointList
          class="facts-route-list"
          :route="prRoute"
          variant="compact"
        />
      </section>

      <section
        v-if="meetingPointSectionVisible"
        class="facts-entry"
        data-testid="pr-detail.meeting-point"
        :data-visibility="meetingPointVisibility"
      >
        <InfoRow v-if="isMeetingPointPrivate" :label="t('prCard.meetingPoint')">
          {{ t("prCard.meetingPointPrivate") }}
        </InfoRow>

        <Button
          v-else-if="interactive && meetingPointImageUrl"
          class="facts-entry-button"
          tone="ghost"
          block
          @click="showMeetingPointGalleryModal = true"
        >
          <span class="facts-entry-button__content">
            <span class="facts-entry-button__label">{{
              t("prCard.meetingPoint")
            }}</span>
            <span class="facts-entry-button__trailing">
              <span class="facts-entry-button__action">
                {{ t("prCard.viewMeetingPointImage") }}
              </span>
              <span
                class="facts-entry-button__icon i-mdi-chevron-right"
                aria-hidden="true"
              />
            </span>
          </span>
        </Button>

        <InfoRow v-else :label="t('prCard.meetingPoint')">
          {{ meetingPointDescription ?? t("prPage.partnerSection.notSet") }}
        </InfoRow>

        <p
          v-if="interactive && meetingPointImageUrl && meetingPointDescription"
          class="facts-entry__value"
        >
          {{ meetingPointDescription }}
        </p>
      </section>

      <InfoRow :label="t('prCard.time')">
        {{ localizedTimeText }}
      </InfoRow>

      <InfoRow
        v-if="hasPreferences"
        :label="t('prCard.preferences')"
        layout="stack"
        align="start"
      >
        <ChipGroup>
          <Chip v-for="item in prDetail.core.preferences" :key="item">
            {{ item }}
          </Chip>
        </ChipGroup>
      </InfoRow>

      <section class="facts-entry">
        <InfoRowAction
          v-if="interactive"
          label="参与概览"
          :value="participantCountText"
          :aria-label="t('prPage.partnerSection.rosterBoardTitle')"
          @click="showRosterModal = true"
        />

        <InfoRow v-else label="参与概览">
          {{ participantCountText }}
        </InfoRow>

        <div class="facts-entry__value facts-entry__value--badges">
          <ChipGroup v-if="rosterPreview.length > 0">
            <template v-for="item in rosterPreview" :key="item.partnerId">
              <RouterLink
                v-if="interactive && isRosterLinkable(item.state)"
                :to="partnerProfilePath(item.partnerId)"
                class="roster-preview-link"
              >
                <Chip>{{ item.displayName }}</Chip>
              </RouterLink>

              <Chip v-else>
                {{ item.displayName }}
              </Chip>
            </template>

            <span v-if="hasMoreRoster" class="roster-chip-overflow">...</span>
          </ChipGroup>

          <span v-else class="facts-empty">
            {{ t("prPage.partnerSection.rosterCurrentEmpty") }}
          </span>
        </div>
      </section>

      <InfoRow
        v-if="normalizedNotes"
        :label="t('prCard.notes')"
        layout="stack"
        align="start"
      >
        <p class="facts-notes">{{ normalizedNotes }}</p>
      </InfoRow>
    </template>
  </SurfaceCard>

  <PRRosterModal
    v-if="interactive && prDetail"
    :open="showRosterModal"
    :pr-id="prDetail.id"
    :section="prDetail.partnerSection"
    @close="showRosterModal = false"
  />

  <PRLocationGalleryModal
    v-if="interactive"
    :open="showLocationGalleryModal"
    :images="locationGallery"
    @close="showLocationGalleryModal = false"
  />

  <PRLocationGalleryModal
    v-if="interactive"
    :open="showMeetingPointGalleryModal"
    :images="meetingPointImageUrl ? [meetingPointImageUrl] : []"
    :title="t('prCard.meetingPointImageTitle')"
    @close="showMeetingPointGalleryModal = false"
  />

  <PRRouteMapModal
    v-if="interactive"
    :open="showRouteMapModal"
    :route="prRoute"
    :title="t('prCard.routeMapTitle')"
    @close="showRouteMapModal = false"
  />
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import SurfaceCard from "@/shared/ui/containers/SurfaceCard.vue";
import InfoRow from "@/shared/ui/display/InfoRow.vue";
import InfoRowAction from "@/shared/ui/display/InfoRowAction.vue";
import Chip from "@/shared/ui/display/Chip.vue";
import ChipGroup from "@/shared/ui/display/ChipGroup.vue";
import Button from "@/shared/ui/actions/Button.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import PRLocationGalleryModal from "@/domains/pr/ui/modals/PRLocationGalleryModal.vue";
import PRRouteMapModal from "@/domains/pr/ui/modals/PRRouteMapModal.vue";
import PRRosterModal from "@/domains/pr/ui/modals/PRRosterModal.vue";
import type { PRPartnerSectionView } from "@/domains/pr/model/types";
import { prPartnerProfilePath } from "@/domains/pr/routing/routes";
import { usePRDetail } from "@/domains/pr/queries/usePRDetail";
import { usePRLocationGallery } from "@/domains/pr/use-cases/usePRLocationGallery";
import RoutePointList from "@/domains/route/ui/RoutePointList.vue";
import { buildRouteEndpointLabel } from "@/domains/route/model/route";
import { formatLocalDateTimeValue } from "@/shared/datetime/formatLocalDateTime";

type RosterPreviewItem = PRPartnerSectionView["roster"][number];

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    prId: PRId;
    interactive?: boolean;
  }>(),
  {
    interactive: true,
  },
);

const emit = defineEmits<{
  ready: [];
}>();

const { t } = useI18n();

const prId = computed(() => props.prId);
const { data, isLoading, error } = usePRDetail(prId);
const prDetail = computed(() => data.value);
const showLocationGalleryModal = ref(false);
const showMeetingPointGalleryModal = ref(false);
const showRouteMapModal = ref(false);
const showRosterModal = ref(false);
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const FACTS_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})\s(.+)$/;

const normalizeDisplayText = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
};

const { locationId, locationGallery } = usePRLocationGallery(
  computed(() => prDetail.value?.core.location ?? null),
);

watch(locationId, () => {
  showLocationGalleryModal.value = false;
});

const locationGalleryAvailable = computed(
  () => locationGallery.value.length > 0,
);

const prRoute = computed(() => prDetail.value?.core.route ?? null);
const routeAvailable = computed(() => (prRoute.value?.length ?? 0) >= 2);
const locationDisplayName = computed(() =>
  normalizeDisplayText(prDetail.value?.core.location),
);
const locationDisplayText = computed(
  () => locationDisplayName.value ?? t("prPage.partnerSection.notSet"),
);
const showLocationSection = computed(
  () => locationDisplayName.value !== null || !routeAvailable.value,
);
const routeDisplayText = computed(
  () =>
    buildRouteEndpointLabel(prRoute.value) ??
    normalizeDisplayText(prDetail.value?.core.placeDisplayName) ??
    t("prPage.partnerSection.notSet"),
);

watch(prRoute, () => {
  showRouteMapModal.value = false;
});

const meetingPointDescription = computed(() => {
  const description =
    prDetail.value?.core.meetingPoint?.description?.trim() ?? "";
  return description.length > 0 ? description : null;
});

const meetingPointImageUrl = computed(() => {
  const imageUrl = prDetail.value?.core.meetingPoint?.imageUrl?.trim() ?? "";
  return imageUrl.length > 0 ? imageUrl : null;
});
const meetingPointVisibility = computed(
  () => prDetail.value?.core.meetingPointVisibility ?? "VISIBLE",
);
const isMeetingPointPrivate = computed(
  () => meetingPointVisibility.value === "ACTIVE_PARTICIPANTS_ONLY",
);
const meetingPointSectionVisible = computed(
  () =>
    isMeetingPointPrivate.value ||
    meetingPointDescription.value !== null ||
    meetingPointImageUrl.value !== null,
);

const normalizedNotes = computed(() => {
  const trimmed = prDetail.value?.core.notes?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
});
const hasPreferences = computed(
  () => (prDetail.value?.core.preferences.length ?? 0) > 0,
);

const extractFactsTimeDatePart = (formatted: string | null): string | null => {
  if (!formatted) {
    return null;
  }

  const matched = formatted.match(FACTS_TIME_PATTERN);
  if (!matched) {
    return null;
  }

  return `${matched[1]}-${matched[2]}-${matched[3]}`;
};

const resolveRelativeDayLabelByDate = (
  year: number,
  month: number,
  day: number,
): "今天" | "明天" | "后天" | null => {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const targetStart = new Date(year, month - 1, day);
  if (Number.isNaN(targetStart.getTime())) {
    return null;
  }

  const diffDays = Math.round(
    (targetStart.getTime() - todayStart.getTime()) / DAY_IN_MS,
  );
  if (diffDays === 0) {
    return "今天";
  }

  if (diffDays === 1) {
    return "明天";
  }

  if (diffDays === 2) {
    return "后天";
  }

  return null;
};

const formatFactsTimePoint = (
  formatted: string | null,
  includeRelativeDayLabel: boolean,
): string | null => {
  if (!formatted || !includeRelativeDayLabel) {
    return formatted;
  }

  const matched = formatted.match(FACTS_TIME_PATTERN);
  if (!matched) {
    return formatted;
  }

  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  const timePart = matched[4];
  const relativeDayLabel = resolveRelativeDayLabelByDate(year, month, day);
  if (!relativeDayLabel) {
    return formatted;
  }

  const datePart = `${matched[1]}-${matched[2]}-${matched[3]}`;
  return `${datePart} (${relativeDayLabel}) ${timePart}`;
};

const localizedTimeText = computed(() => {
  const [startRaw, endRaw] = prDetail.value?.core.time ?? [null, null];
  const startBase = formatLocalDateTimeValue(startRaw);
  const endBase = formatLocalDateTimeValue(endRaw);
  const sameDay =
    extractFactsTimeDatePart(startBase) !== null &&
    extractFactsTimeDatePart(startBase) === extractFactsTimeDatePart(endBase);
  const start = formatFactsTimePoint(startBase, true);
  const end = formatFactsTimePoint(endBase, !sameDay);

  if (start && end) return `${start} - ${end}`;
  return start ?? end ?? t("prPage.partnerSection.notSet");
});

const participantCountText = computed(() => {
  if (!prDetail.value) return "";
  const current = prDetail.value.partnerSection.capacity.current;
  const max = prDetail.value.partnerSection.capacity.max;
  return max === null ? String(current) : `${current}/${max}`;
});

const isActiveRosterState = (state: RosterPreviewItem["state"]): boolean =>
  state === "JOINED" || state === "CONFIRMED" || state === "ATTENDED";

const activeRoster = computed(
  () =>
    prDetail.value?.partnerSection.roster.filter((item) =>
      isActiveRosterState(item.state),
    ) ?? [],
);
const rosterPreview = computed(() => activeRoster.value.slice(0, 4));
const hasMoreRoster = computed(
  () => activeRoster.value.length > rosterPreview.value.length,
);

const partnerProfilePath = (partnerId: number): string =>
  prPartnerProfilePath(props.prId, partnerId);

const isRosterLinkable = (state: RosterPreviewItem["state"]): boolean =>
  state !== "RELEASED" && state !== "EXITED";

watch(
  prDetail,
  async (value) => {
    if (!value) {
      return;
    }
    await nextTick();
    emit("ready");
  },
  { immediate: true },
);
</script>

<style scoped lang="scss">
.pr-facts-card {
  min-width: 0;
}

.facts-title {
  margin: 0;
  @include mx.pu-font(title-medium);
  color: var(--sys-color-on-surface);
}

.facts-entry {
  display: flex;
  flex-direction: column;
  gap: calc(var(--sys-spacing-xsmall) / 2);
  min-width: 0;
}

.facts-entry__heading {
  margin: 0;
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface-variant);
}

.facts-entry__value {
  margin: 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface);
  overflow-wrap: anywhere;
}

.facts-entry__value--badges {
  display: flex;
}

.facts-route-list {
  padding-top: calc(var(--sys-spacing-xsmall) / 2);
}

.facts-entry-button {
  padding: 0 !important;
  border: none;
  justify-content: flex-start;
}

.facts-entry-button:deep(.ui-button__content) {
  width: 100%;
}

.facts-entry-button__content {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  text-align: left;
}

.facts-entry-button__label {
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface-variant);
}

.facts-entry-button__trailing {
  display: inline-flex;
  align-items: center;
  gap: var(--sys-spacing-xsmall);
  flex-shrink: 0;
}

.facts-entry-button__action {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-secondary);
}

.facts-entry-button__icon {
  @include mx.pu-icon(small);
  color: var(--sys-color-secondary);
}

.facts-empty {
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.facts-notes {
  margin: 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.roster-preview-link {
  display: inline-flex;
  border-radius: 999px;
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.roster-chip-overflow {
  @include mx.pu-font(label-medium);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--sys-size-medium);
  padding: var(--sys-spacing-xsmall) var(--sys-spacing-small);
  border-radius: 999px;
  background: var(--sys-color-secondary-container);
  color: var(--sys-color-on-secondary-container);
}
</style>
