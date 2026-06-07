<template>
  <section class="awareness-lane">
    <header class="lane-header">
      <h2 class="lane-title">
        {{ t("prPage.partnerSection.rosterBoardTitle") }}
      </h2>
    </header>

    <p class="lane-capacity">
      {{ capacitySummaryText }}
    </p>

    <p v-if="section.roster.length === 0" class="lane-empty">
      {{ t("prPage.partnerSection.rosterEmpty") }}
    </p>

    <template v-else>
      <section class="roster-group">
        <p v-if="activeRoster.length === 0" class="lane-empty">
          {{ t("prPage.partnerSection.rosterCurrentEmpty") }}
        </p>

        <div v-else class="roster-list">
          <PRRosterItem
            v-for="item in activeRoster"
            :key="item.partnerId"
            :display-name="item.displayName"
            :avatar-url="item.avatarUrl"
            :avatar-alt="rosterAvatarAlt(item.displayName)"
            :avatar-fallback="rosterAvatarFallback(item.displayName)"
            :is-self="item.isSelf"
            :is-creator="item.isCreator"
            :self-label="t('prPage.partnerSection.rosterSelf')"
            :creator-label="t('prPage.partnerSection.rosterCreator')"
            :state-label="rosterStateText(item.state)"
            :to="rosterItemProfilePath(item)"
            variant="plain"
          />
        </div>
      </section>

      <details v-if="historyRoster.length > 0" class="roster-history">
        <summary class="roster-history__summary">
          <span>{{ t("prPage.partnerSection.rosterHistoryTitle") }}</span>
          <span class="roster-history__count">
            {{
              t("prPage.partnerSection.rosterCount", {
                count: historyRoster.length,
              })
            }}
          </span>
        </summary>

        <div class="roster-list roster-list--history">
          <PRRosterItem
            v-for="item in historyRoster"
            :key="item.partnerId"
            :display-name="item.displayName"
            :avatar-url="item.avatarUrl"
            :avatar-alt="rosterAvatarAlt(item.displayName)"
            :avatar-fallback="rosterAvatarFallback(item.displayName)"
            :is-self="item.isSelf"
            :is-creator="item.isCreator"
            :self-label="t('prPage.partnerSection.rosterSelf')"
            :creator-label="t('prPage.partnerSection.rosterCreator')"
            :state-label="rosterStateText(item.state)"
            :to="rosterItemProfilePath(item)"
            variant="plain"
          />
        </div>
      </details>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { PRPartnerSectionView } from "@/domains/pr/model/types";
import { prPartnerProfilePath } from "@/domains/pr/routing/routes";
import PRRosterItem from "@/domains/pr/ui/primitives/PRRosterItem.vue";

type PartnerSection = PRPartnerSectionView;

const props = defineProps<{
  prId: number;
  section: PartnerSection;
}>();

const { t } = useI18n();
type RosterItem = PartnerSection["roster"][number];

const rosterStateText = (
  state: RosterItem["state"],
): string => {
  switch (state) {
    case "CONFIRMED":
      return t("prPage.partnerSection.rosterConfirmed");
    case "ATTENDED":
      return t("prPage.partnerSection.rosterAttended");
    case "EXITED":
      return t("prPage.partnerSection.rosterExited");
    case "RELEASED":
      return t("prPage.partnerSection.rosterReleased");
    default:
      return t("prPage.partnerSection.rosterJoined");
  }
};

const isRosterLinkable = (
  state: RosterItem["state"],
): boolean => state !== "RELEASED" && state !== "EXITED";
const isActiveRosterState = (state: RosterItem["state"]): boolean =>
  state === "JOINED" || state === "CONFIRMED" || state === "ATTENDED";
const activeRoster = computed(() =>
  props.section.roster.filter((item) => isActiveRosterState(item.state)),
);
const historyRoster = computed(() =>
  props.section.roster.filter((item) => !isActiveRosterState(item.state)),
);
const capacitySummaryText = computed(() => {
  const parts = [
    t("prPage.partnerSection.rosterCapacityCurrent", {
      current: props.section.capacity.current,
    }),
  ];
  const min = props.section.capacity.min;
  const max = props.section.capacity.max;
  if (min !== null) {
    parts.push(t("prPage.partnerSection.rosterCapacityMin", { min }));
  }
  if (max !== null) {
    parts.push(t("prPage.partnerSection.rosterCapacityMax", { max }));
  }
  return parts.join(" · ");
});

const partnerProfilePath = (partnerId: number): string =>
  prPartnerProfilePath(props.prId, partnerId);

const rosterItemProfilePath = (item: RosterItem): string | null =>
  isRosterLinkable(item.state) ? partnerProfilePath(item.partnerId) : null;

const rosterAvatarAlt = (name: string): string =>
  t("prPage.partnerSection.rosterAvatarAlt", { name });

const rosterAvatarFallback = (displayName: string): string => {
  const normalized = displayName.trim();
  if (normalized.length > 0) return normalized.slice(0, 1).toUpperCase();
  return t("prPage.partnerSection.rosterAvatarFallback");
};
</script>

<style lang="scss" scoped>
.awareness-lane {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.lane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--sys-spacing-small);
}

.lane-title {
  margin: 0;
  @include mx.pu-font(section);
}

.lane-capacity,
.lane-empty {
  margin: 0;
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

.roster-list {
  display: flex;
  flex-direction: column;
}

.roster-list > * + * {
  border-top: 1px solid var(--sys-color-outline-variant);
}

.roster-list--history {
  margin-top: var(--sys-spacing-small);
}

.roster-group {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.roster-history {
  padding-top: var(--sys-spacing-small);
  border-top: 1px solid var(--sys-color-outline-variant);
}

.roster-history__summary {
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
}

.roster-history__summary::-webkit-details-marker {
  display: none;
}

.roster-history__count {
  @include mx.pu-font(support);
}

</style>
