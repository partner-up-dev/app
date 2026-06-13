<template>
  <PuCard v-bind="$attrs" as="section" class="pr-facts-card" gap="sm">
    <PuLoadingState v-if="isLoading" :message="t('common.loading')" />
    <ErrorToast v-else-if="error" :message="error.message" persistent />

    <template v-else-if="prDetail">
      <h2 class="facts-title">活动信息</h2>

      <PuDescriptionList
        class="facts-list"
        variant="plain"
        surface-level="plain"
        density="compact"
        :dividers="false"
      >
        <section v-if="showLocationSection" class="facts-entry">
          <Button
            v-if="interactive && locationGalleryAvailable"
            class="facts-entry-button"
            tone="ghost"
            block
            @click="showLocationGalleryModal = true"
          >
            <span class="facts-entry-button__body">
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

          <PuDescriptionItem
            v-else
            :label="t('prCard.location')"
            value-align="end"
          >
            <span class="facts-inline-value">
              <span>{{ locationDisplayText }}</span>
              <span
                v-if="locationEditableAfterReady"
                class="facts-editable-mark"
              >
                可调整
              </span>
            </span>
          </PuDescriptionItem>

          <p
            v-if="interactive && locationGalleryAvailable"
            class="facts-entry__value"
          >
            <span class="facts-inline-value">
              <span>{{ locationDisplayText }}</span>
              <span
                v-if="locationEditableAfterReady"
                class="facts-editable-mark"
              >
                可调整
              </span>
            </span>
          </p>
        </section>

        <section
          v-if="routeAvailable"
          class="facts-entry"
          data-testid="pr-detail.route"
        >
          <PuDescriptionItem
            v-if="interactive"
            :label="t('prCard.route')"
            value-align="end"
          >
            <template #action>
              <button
                class="facts-row-action"
                type="button"
                :aria-label="
                  t('prCard.viewRouteMapAria', {
                    route: routeDisplayText,
                  })
                "
                @click="showRouteMapModal = true"
              >
                <span>{{ t("prCard.viewRouteMap") }}</span>
                <span
                  class="facts-row-action__icon i-mdi-chevron-right"
                  aria-hidden="true"
                />
              </button>
            </template>
          </PuDescriptionItem>

          <PuDescriptionItem
            v-else
            :label="t('prCard.route')"
            value-align="end"
          >
            <span class="facts-inline-value">
              <span>{{ routeDisplayText }}</span>
              <span v-if="routeEditableAfterReady" class="facts-editable-mark">
                可调整
              </span>
            </span>
          </PuDescriptionItem>

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
          <PuDescriptionItem
            v-if="isMeetingPointPrivate"
            :label="t('prCard.meetingPoint')"
            value-align="end"
          >
            {{ t("prCard.meetingPointPrivate") }}
          </PuDescriptionItem>

          <Button
            v-else-if="interactive && meetingPointImageUrl"
            class="facts-entry-button"
            tone="ghost"
            block
            @click="showMeetingPointGalleryModal = true"
          >
            <span class="facts-entry-button__body">
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

          <PuDescriptionItem
            v-else
            :label="t('prCard.meetingPoint')"
            value-align="end"
          >
            {{ meetingPointDescription ?? t("prPage.partnerSection.notSet") }}
          </PuDescriptionItem>

          <p
            v-if="interactive && meetingPointImageUrl && meetingPointDescription"
            class="facts-entry__value"
          >
            {{ meetingPointDescription }}
          </p>
        </section>

        <PuDescriptionItem :label="t('prCard.time')" value-align="end">
          <span class="facts-inline-value">
            <span data-testid="pr-detail.facts.time-value">
              {{ localizedTimeText }}
            </span>
            <span v-if="timeEditableAfterReady" class="facts-editable-mark">
              可调整
            </span>
          </span>
        </PuDescriptionItem>

        <PuDescriptionItem
          v-if="hasPreferences"
          :label="t('prCard.preferences')"
          value-align="start"
        >
          <PuChipGroup>
            <PuChip v-for="item in prDetail.core.preferences" :key="item">
              {{ item }}
            </PuChip>
          </PuChipGroup>
        </PuDescriptionItem>

        <section class="facts-entry">
          <PuDescriptionItem
            v-if="interactive"
            label="参与概览"
            value-align="end"
          >
            <template #action>
              <button
                class="facts-row-action"
                type="button"
                :aria-label="t('prPage.partnerSection.rosterBoardTitle')"
                @click="showRosterModal = true"
              >
                <span>{{ participantCountText }}</span>
                <span
                  class="facts-row-action__icon i-mdi-chevron-right"
                  aria-hidden="true"
                />
              </button>
            </template>
          </PuDescriptionItem>

          <PuDescriptionItem v-else label="参与概览" value-align="end">
            {{ participantCountText }}
          </PuDescriptionItem>

          <div class="facts-entry__value facts-entry__value--badges">
            <PuChipGroup v-if="rosterPreview.length > 0">
              <template v-for="item in rosterPreview" :key="item.partnerId">
                <RouterLink
                  v-if="interactive && isRosterLinkable(item.state)"
                  :to="partnerProfilePath(item.partnerId)"
                  class="roster-preview-link"
                >
                  <PuChip>{{ item.displayName }}</PuChip>
                </RouterLink>

                <PuChip v-else>
                  {{ item.displayName }}
                </PuChip>
              </template>

              <span v-if="hasMoreRoster" class="roster-chip-overflow">...</span>
            </PuChipGroup>

            <span v-else class="facts-empty">
              {{ t("prPage.partnerSection.rosterCurrentEmpty") }}
            </span>
          </div>
        </section>

        <PuDescriptionItem
          v-if="normalizedNotes"
          :label="t('prCard.notes')"
          value-align="start"
        >
          <p class="facts-notes">{{ normalizedNotes }}</p>
        </PuDescriptionItem>
      </PuDescriptionList>
    </template>
  </PuCard>

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
import {
  PuCard,
  PuChip,
  PuChipGroup,
  PuDescriptionItem,
  PuDescriptionList,
  PuLoadingState,
} from "@partner-up-dev/design-web";
import Button from "@/shared/ui/actions/Button.vue";
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
import { formatFriendlyTimeWindowLabel } from "@/shared/datetime/formatLocalDateTime";

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

const localizedTimeText = computed(() => {
  return formatFriendlyTimeWindowLabel(
    prDetail.value?.core.time ?? [null, null],
    t("prPage.partnerSection.notSet"),
  );
});

const timeEditableAfterReady = computed(() =>
  prDetail.value?.editPostReadyCapability.editableFields.includes("time") ??
  false,
);
const locationEditableAfterReady = computed(() =>
  prDetail.value?.editPostReadyCapability.editableFields.includes("location") ??
  false,
);
const routeEditableAfterReady = computed(() =>
  prDetail.value?.editPostReadyCapability.editableFields.includes("route") ??
  false,
);

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
  @include mx.pu-font(section);
  color: var(--sys-color-on-surface);
}

.facts-list {
  min-width: 0;
}

.facts-entry {
  display: flex;
  flex-direction: column;
  gap: calc(var(--sys-spacing-xsmall) / 2);
  min-width: 0;
}

.facts-entry__heading {
  margin: 0;
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
}

.facts-entry__value {
  margin: 0;
  @include mx.pu-font(body);
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

.facts-entry-button:deep(.ui-button__label) {
  width: 100%;
}

.facts-entry-button__body {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  text-align: left;
}

.facts-entry-button__label {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
}

.facts-entry-button__trailing {
  display: inline-flex;
  align-items: center;
  gap: var(--sys-spacing-xsmall);
  flex-shrink: 0;
}

.facts-entry-button__action {
  @include mx.pu-font(control);
  color: var(--sys-color-secondary);
}

.facts-entry-button__icon {
  @include mx.pu-icon(small);
  color: var(--sys-color-secondary);
}

.facts-row-action {
  @include mx.pu-font(control);
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--sys-spacing-xsmall);
  min-width: 0;
  padding: 0;
  border: 0;
  border-radius: var(--sys-radius-small);
  background: transparent;
  color: var(--sys-color-secondary);
  cursor: pointer;
}

.facts-row-action:focus-visible {
  outline: 2px solid var(--sys-color-primary);
  outline-offset: 2px;
}

.facts-row-action__icon {
  @include mx.pu-icon(small);
  flex-shrink: 0;
}

.facts-empty {
  @include mx.pu-font(support);
  color: var(--sys-color-on-surface-variant);
}

.facts-inline-value {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sys-spacing-xsmall);
}

.facts-editable-mark {
  @include mx.pu-font(caption);
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 var(--sys-spacing-xsmall);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-variant);
  color: var(--sys-color-on-surface-variant);
}

.facts-notes {
  margin: 0;
  @include mx.pu-font(body);
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
  @include mx.pu-font(control);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--sys-spacing-large);
  padding: var(--sys-spacing-xsmall) var(--sys-spacing-small);
  border-radius: 999px;
  background: var(--sys-color-secondary-container);
  color: var(--sys-color-on-secondary-container);
}
</style>
