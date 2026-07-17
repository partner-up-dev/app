<template>
  <section class="partner-section">
    <header class="partner-section__header">
      <div class="partner-section__header-body">
        <div class="flex justify-between">
          <h2 class="partner-section__title">
            {{ t("prPage.partnerSection.title") }}
          </h2>
          <PuTag tone="primary" size="md" :text="slotStateText" variant="soft" shape="pill" />
        </div>
        <p class="partner-section__subtitle">{{ subtitleParticipantTimeline }}</p>
      </div>
    </header>

    <div class="partner-section__summary">
      <article class="partner-section__summary-card">
        <span class="partner-section__summary-label">{{
          t("prPage.partnerSection.summaryCurrent")
        }}</span>
        <strong class="partner-section__summary-value">{{ section.capacity.current }}</strong>
      </article>
      <article class="partner-section__summary-card">
        <span class="partner-section__summary-label">{{
          t("prPage.partnerSection.summaryMin")
        }}</span>
        <strong class="partner-section__summary-value">{{
          nullableNumberLabel(section.capacity.min)
        }}</strong>
      </article>
      <article class="partner-section__summary-card">
        <span class="partner-section__summary-label">{{
          t("prPage.partnerSection.summaryMax")
        }}</span>
        <strong class="partner-section__summary-value">{{
          nullableNumberLabel(section.capacity.max)
        }}</strong>
      </article>
      <article class="partner-section__summary-card">
        <span class="partner-section__summary-label">{{
          t("prPage.partnerSection.summaryState")
        }}</span>
        <strong class="partner-section__summary-value">{{ readinessText }}</strong>
      </article>
    </div>

    <div class="partner-section__actions">
      <PuButton v-if="section.viewer.canJoin" :disabled="joinPending" @click="emit('join')">
        {{ joinPending ? t("prPage.joining") : t("prPage.join") }}
      </PuButton>

      <PuButton
        v-if="section.viewer.canExit"
        tone="danger"
        variant="outline"
        :disabled="exitPending"
        @click="emit('exit')"
      >
        {{ exitPending ? t("prPage.exiting") : t("prPage.exit") }}
      </PuButton>

      <PuButton
        v-if="section.viewer.canConfirm"
        tone="primary"
        variant="outline"
        :disabled="confirmPending"
        @click="emit('confirm-slot')"
      >
        {{ confirmPending ? t("prPage.confirmingSlot") : t("prPage.confirmSlot") }}
      </PuButton>

      <PuButton
        v-if="section.viewer.canCheckIn"
        tone="primary"
        variant="outline"
        :disabled="checkInPending"
        @click="emit('submit-check-in')"
      >
        {{ checkInPending ? t("prPage.checkingIn") : t("prPage.checkInAttended") }}
      </PuButton>
    </div>

    <p v-if="joinErrorMessage" class="partner-section__error-note">
      {{ joinErrorMessage }}
    </p>

    <p v-if="availabilityNote" class="partner-section__availability-note">
      {{ availabilityNote }}
    </p>

    <section class="partner-section__panel">
      <div class="partner-section__panel-header">
        <h3 class="partner-section__panel-title">
          {{ t("prPage.partnerSection.rosterTitle") }}
        </h3>
        <span class="partner-section__panel-meta">
          {{
            t("prPage.partnerSection.rosterCount", {
              count: section.roster.length,
            })
          }}
        </span>
      </div>

      <p v-if="section.roster.length === 0" class="partner-section__empty">
        {{ t("prPage.partnerSection.rosterEmpty") }}
      </p>

      <div v-else class="partner-section__roster">
        <PRRosterItem
          v-for="item in section.roster"
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
          variant="card"
        />
      </div>
    </section>

    <section v-if="section.timeline" class="partner-section__panel">
      <div class="partner-section__panel-header">
        <h3 class="partner-section__panel-title">
          {{ t("prPage.partnerSection.timelineTitle") }}
        </h3>
      </div>

      <div class="partner-section__timeline">
        <div class="partner-section__timeline-item">
          <span class="partner-section__timeline-label">{{
            t("prPage.partnerSection.timelinePRStart")
          }}</span>
          <span class="partner-section__timeline-value">{{
            formatDateTime(section.timeline.startAt)
          }}</span>
        </div>
        <div class="partner-section__timeline-item">
          <span class="partner-section__timeline-label">{{
            t("prPage.partnerSection.timelineConfirmationWindow")
          }}</span>
          <span class="partner-section__timeline-value">
            {{
              formatWindow(section.timeline.confirmationStartAt, section.timeline.confirmationEndAt)
            }}
          </span>
        </div>
        <div class="partner-section__timeline-item">
          <span class="partner-section__timeline-label">{{
            t("prPage.partnerSection.timelineJoinLock")
          }}</span>
          <span class="partner-section__timeline-value">{{
            formatDateTime(section.timeline.joinLockAt)
          }}</span>
        </div>
      </div>
    </section>

    <section
      v-if="section.reminder.supported && section.reminder.visible"
      class="partner-section__panel"
    >
      <div class="partner-section__panel-header">
        <h3 class="partner-section__panel-title">
          {{ t("prPage.wechatReminder.title") }}
        </h3>
      </div>

      <p class="partner-section__note">{{ reminderHintText }}</p>

      <PuButton
        v-if="canToggleReminder"
        :disabled="reminderTogglePending"
        @click="emit('toggle-reminder')"
      >
        {{
          reminderTogglePending
            ? t("prPage.wechatReminder.updating")
            : reminderEnabled
              ? t("prPage.wechatReminder.disableAction")
              : t("prPage.wechatReminder.enableAction")
        }}
      </PuButton>

      <PuButton
        v-else-if="isWeChatEnv && reminderConfigured && !reminderAuthenticated"
        tone="neutral"
        variant="soft"
        @click="emit('go-wechat-login')"
      >
        {{ t("prPage.wechatReminder.loginAction") }}
      </PuButton>
    </section>
  </section>
</template>

<script setup lang="ts">
import { PuButton, PuTag } from "@partner-up-dev/design-web";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { PRPartnerSectionView } from "@/domains/pr/model/types";
import { prPartnerProfilePath } from "@/domains/pr/routing/routes";
import PRRosterItem from "@/domains/pr/ui/primitives/PRRosterItem.vue";
import {
  formatFriendlyTimeWindowLabel,
  formatLocalDateTimeValue,
} from "@/shared/datetime/formatLocalDateTime";

type PartnerSectionView = PRPartnerSectionView;

const props = withDefaults(
  defineProps<{
    prId: number;
    section: PartnerSectionView;
    slotStateText: string;
    joinPending?: boolean;
    exitPending?: boolean;
    confirmPending?: boolean;
    checkInPending?: boolean;
    joinErrorMessage?: string | null;
    canToggleReminder?: boolean;
    reminderEnabled?: boolean;
    reminderTogglePending?: boolean;
    reminderAuthenticated?: boolean;
    reminderConfigured?: boolean;
    reminderHintText?: string;
    isWeChatEnv?: boolean;
  }>(),
  {
    joinPending: false,
    exitPending: false,
    confirmPending: false,
    checkInPending: false,
    joinErrorMessage: null,
    canToggleReminder: false,
    reminderEnabled: false,
    reminderTogglePending: false,
    reminderAuthenticated: false,
    reminderConfigured: false,
    reminderHintText: "",
    isWeChatEnv: false,
  },
);

const emit = defineEmits<{
  join: [];
  exit: [];
  "confirm-slot": [];
  "submit-check-in": [];
  "toggle-reminder": [];
  "go-wechat-login": [];
}>();

const { t } = useI18n();

const subtitleParticipantTimeline = computed(() => {
  if (props.section.reminder.supported || props.section.timeline) {
    return t("prPage.partnerSection.subtitleParticipantTimeline");
  }
  return t("prPage.partnerSection.subtitleParticipation");
});

const readinessText = computed(() => {
  switch (props.section.capacity.readiness) {
    case "READY":
      return t("prPage.partnerSection.readinessReady");
    case "FULL":
      return t("prPage.partnerSection.readinessFull");
    case "ACTIVE":
      return t("prPage.partnerSection.readinessActive");
    case "UNAVAILABLE":
      return t("prPage.partnerSection.readinessUnavailable");
    default:
      return t("prPage.partnerSection.readinessNeedsMore", {
        count: props.section.capacity.neededToReady,
      });
  }
});

const availabilityNote = computed(() => {
  if (props.section.viewer.isCreator) {
    return t("prPage.partnerSection.creatorHint");
  }

  if (props.section.viewer.isParticipant) {
    if (!props.section.viewer.canExit) {
      return blockedReasonText(props.section.viewer.exitBlockedReason);
    }
    if (
      props.section.reminder.supported &&
      !props.section.viewer.canConfirm &&
      props.section.viewer.slotState === "JOINED"
    ) {
      return blockedReasonText(props.section.viewer.confirmBlockedReason);
    }
    return t("prPage.partnerSection.joinedHint");
  }

  if (props.section.viewer.canJoin) {
    return t("prPage.partnerSection.openHint");
  }

  return blockedReasonText(props.section.viewer.joinBlockedReason);
});

const nullableNumberLabel = (value: number | null): string =>
  value === null ? t("prPage.partnerSection.unlimited") : String(value);

const formatDateTime = (value: string | null): string =>
  formatLocalDateTimeValue(value) ?? t("prPage.partnerSection.notSet");

const formatWindow = (start: string | null, end: string | null): string => {
  return formatFriendlyTimeWindowLabel([start, end], t("prPage.partnerSection.notSet"));
};

const partnerProfilePath = (partnerId: number): string =>
  prPartnerProfilePath(props.prId, partnerId);

const rosterItemProfilePath = (item: PartnerSectionView["roster"][number]): string | null =>
  isRosterLinkable(item.state) ? partnerProfilePath(item.partnerId) : null;

const confirmWindowText = computed(() => {
  const notSet = t("prPage.partnerSection.notSet");
  if (!props.section.reminder.supported || !props.section.timeline) {
    return { confirmStart: notSet, confirmEnd: notSet };
  }
  return {
    confirmStart: formatLocalDateTimeValue(props.section.timeline.confirmationStartAt) ?? notSet,
    confirmEnd: formatLocalDateTimeValue(props.section.timeline.confirmationEndAt) ?? notSet,
  };
});

const rosterStateText = (state: PartnerSectionView["roster"][number]["state"]): string => {
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

const isRosterLinkable = (state: PartnerSectionView["roster"][number]["state"]): boolean =>
  state !== "RELEASED" && state !== "EXITED";

const rosterAvatarAlt = (name: string): string =>
  t("prPage.partnerSection.rosterAvatarAlt", { name });

const rosterAvatarFallback = (displayName: string): string => {
  const normalized = displayName.trim();
  if (normalized.length > 0) return normalized.slice(0, 1).toUpperCase();
  return t("prPage.partnerSection.rosterAvatarFallback");
};

function blockedReasonText(reason: PartnerSectionView["viewer"]["joinBlockedReason"]): string {
  switch (reason) {
    case "FULL":
      return t("prPage.partnerSection.blockedFull");
    case "JOIN_LOCKED":
      return t("prPage.partnerSection.blockedJoinLocked");
    case "PR_TIME_WINDOW_STARTED":
      return t("prPage.partnerSection.blockedPRTimeWindowStarted");
    case "OUTSIDE_CONFIRM_WINDOW":
      return t("prPage.partnerSection.blockedConfirmWindow", confirmWindowText.value);
    case "ALREADY_CONFIRMED":
      return t("prPage.partnerSection.blockedAlreadyConfirmed");
    case "ALREADY_JOINED":
      return t("prPage.partnerSection.joinedHint");
    case "NOT_JOINED":
      return t("prPage.partnerSection.blockedNotJoined");
    case "NOT_JOINABLE_STATUS":
      return t("prPage.partnerSection.blockedStatus");
    case "CHECKIN_NOT_OPEN":
      return t("prPage.partnerSection.blockedCheckIn");
    default:
      return "";
  }
}
</script>

<style lang="scss" scoped>
.partner-section {
  margin-top: var(--sys-spacing-large);
  padding: var(--sys-spacing-medium);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface-container);
  border-top: 3px solid var(--sys-color-primary);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.partner-section__header,
.partner-section__panel-header,
.partner-section__alternative-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--sys-spacing-small);
}

.partner-section__panel {
  padding: var(--sys-spacing-small);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-high);
  border: 1px solid var(--sys-color-outline-variant);
}

.partner-section__header {
  align-items: flex-start;
  flex-wrap: wrap;
  row-gap: var(--sys-spacing-xsmall);
  padding-bottom: var(--sys-spacing-small);
  border-bottom: 1px solid var(--sys-color-outline-variant);
}

.partner-section__header-body {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  min-width: 0;
}

.partner-section__title {
  margin: 0;
  @include mx.pu-font(section);
  line-height: 1.2;
}

.partner-section__panel-title {
  margin: 0;
  @include mx.pu-font(section);
}

.partner-section__subtitle,
.partner-section__panel-meta,
.partner-section__note,
.partner-section__empty,
.partner-section__availability-note {
  margin: 0;
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

.partner-section__error-note {
  margin: 0;
  @include mx.pu-font(body);
  color: var(--sys-color-error);
}

.partner-section__subtitle {
  line-height: 1.4;
}

.partner-section__summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-small);
}

.partner-section__availability-note {
  padding: var(--sys-spacing-small);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-high);
  border-inline-start: 3px solid var(--sys-color-primary);
  margin-top: var(--sys-spacing-xsmall);
  margin-bottom: var(--sys-spacing-xsmall);
}

.partner-section__summary-card {
  padding: var(--sys-spacing-small);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-high);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.partner-section__summary-label,
.partner-section__timeline-label {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
  margin-right: var(--sys-spacing-small);
}

.partner-section__summary-value,
.partner-section__timeline-value {
  @include mx.pu-font(body);
}

.partner-section__summary-value {
  overflow-wrap: anywhere;
  word-break: break-word;
}

.partner-section__actions,
.partner-section__links,
.partner-section__alternatives,
.partner-section__roster,
.partner-section__timeline {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.partner-section__alternative-meta {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.partner-section__roster {
  margin-top: var(--sys-spacing-xsmall);
}

.partner-section__link-card,
.partner-section__alternative-item,
.partner-section__timeline-item {
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-small);
  background: transparent;
}

.partner-section__alternative-item,
.partner-section__timeline-item {
  align-items: center;
}

.partner-section__link-meta {
  @include mx.pu-font(caption);
  padding: calc(var(--sys-spacing-xsmall) / 2) var(--sys-spacing-small);
  border-radius: 999px;
  background: var(--sys-color-secondary-container);
  color: var(--sys-color-on-secondary-container);
}

.partner-section__link-card {
  display: flex;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  text-decoration: none;
  color: inherit;
}

@media (min-width: 880px) {
  .partner-section__actions {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .partner-section__actions > button {
    flex: 1 1 220px;
  }
}
</style>
