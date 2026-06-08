<template>
  <div
    v-if="variant === 'list'"
    class="anchor-event-beta-group-card-shell"
    :class="{
      'anchor-event-beta-group-card-shell--flash': autoExpandHighlightActive,
    }"
    data-testid="anchor-event.beta-group-card"
  >
    <ExpandableCard
      :key="expandableCardKey"
      class="anchor-event-beta-group-card anchor-event-beta-group-card--list"
      :title="cardTitle"
      :subtitle="description"
      :default-expanded="expandableDefaultExpanded"
      data-region="event-beta-group"
    >
      <div class="anchor-event-beta-group-card__body">
        <img
          v-if="normalizedQrCodeUrl"
          :src="normalizedQrCodeUrl"
          :alt="qrAlt"
          class="anchor-event-beta-group-card__qr"
        />
        <p v-else class="anchor-event-beta-group-card__missing">
          {{ t("anchorEvent.betaGroupCard.qrMissing") }}
        </p>
      </div>
    </ExpandableCard>
  </div>

  <article
    v-else
    class="anchor-event-beta-group-card anchor-event-beta-group-card--card"
    data-region="event-beta-group"
    data-testid="anchor-event.beta-group-card"
  >
    <div class="anchor-event-beta-group-card__summary">
      <span class="anchor-event-beta-group-card__kicker">
        {{ cardTitle }}
      </span>
      <span class="anchor-event-beta-group-card__description">
        {{ description }}
      </span>
    </div>

    <div class="anchor-event-beta-group-card__body">
      <img
        v-if="normalizedQrCodeUrl"
        :src="normalizedQrCodeUrl"
        :alt="qrAlt"
        class="anchor-event-beta-group-card__qr"
      />
      <p v-else class="anchor-event-beta-group-card__missing">
        {{ t("anchorEvent.betaGroupCard.qrMissing") }}
      </p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, toRef } from "vue";
import { useI18n } from "vue-i18n";
import ExpandableCard from "@/shared/ui/containers/ExpandableCard.vue";
import { useExpandableCardAttention } from "./useExpandableCardAttention";

const props = withDefaults(
  defineProps<{
    eventId?: number | string;
    eventTitle: string;
    qrCodeUrl?: string | null;
    defaultExpanded?: boolean;
    autoExpandContextKey?: string | number | null;
    variant?: "list" | "card";
  }>(),
  {
    eventId: undefined,
    qrCodeUrl: null,
    defaultExpanded: false,
    autoExpandContextKey: null,
    variant: "list",
  },
);

const { t } = useI18n();
const {
  autoExpandHighlightActive,
  expandableCardKey,
  expandableDefaultExpanded,
} = useExpandableCardAttention({
  defaultExpanded: toRef(props, "defaultExpanded"),
  autoExpandContextKey: toRef(props, "autoExpandContextKey"),
});

const normalizeHttpUrl = (value: string | null | undefined): string | null => {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

const qrAlt = computed(() =>
  t("anchorEvent.betaGroupCard.qrAlt", { eventTitle: props.eventTitle }),
);
const normalizedQrCodeUrl = computed(() => normalizeHttpUrl(props.qrCodeUrl));
const cardTitle = computed(() => {
  const title = props.eventTitle.trim();
  return title.length > 0
    ? `${title}群`
    : t("anchorEvent.betaGroupCard.kicker");
});
const description = computed(() => t("anchorEvent.betaGroupCard.description"));
</script>

<style lang="scss" scoped>
.anchor-event-beta-group-card--card {
  padding: var(--sys-spacing-medium);
  border-radius: var(--sys-radius-large);
  background: var(--sys-color-surface-container);
  border: 1px solid var(--sys-color-outline-variant);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.anchor-event-beta-group-card-shell :deep(.expandable-card) {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.anchor-event-beta-group-card-shell :deep(.expandable-card)::before {
  content: "";
  position: absolute;
  inset: 0;
  background: transparent;
  pointer-events: none;
  z-index: 0;
}

.anchor-event-beta-group-card-shell :deep(.expandable-card__toggle),
.anchor-event-beta-group-card-shell :deep(.expandable-card__body) {
  position: relative;
  z-index: 1;
}

.anchor-event-beta-group-card-shell--flash :deep(.expandable-card)::before {
  animation: beta-group-card-surface-flash 900ms ease-in-out 1;
}

.anchor-event-beta-group-card__summary {
  display: grid;
  gap: var(--sys-spacing-xsmall);
}

.anchor-event-beta-group-card__kicker {
  @include mx.pu-font(section);
  color: var(--sys-color-on-surface);
}

.anchor-event-beta-group-card__description {
  @include mx.pu-font(support);
  color: var(--sys-color-on-surface-variant);
}

.anchor-event-beta-group-card__body {
  display: grid;
  justify-items: center;
}

.anchor-event-beta-group-card__qr {
  width: min(100%, 220px);
  border-radius: var(--sys-radius-medium);
}

.anchor-event-beta-group-card__missing {
  @include mx.pu-font(body);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

@keyframes beta-group-card-surface-flash {
  0% {
    background-color: transparent;
  }

  12% {
    background-color: var(--sys-color-primary-container);
  }

  24% {
    background-color: transparent;
  }

  42% {
    background-color: var(--sys-color-primary-container);
  }

  54%,
  100% {
    background-color: transparent;
  }
}
</style>
