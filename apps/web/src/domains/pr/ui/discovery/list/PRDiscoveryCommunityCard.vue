<template>
  <div
    v-if="variant === 'list'"
    class="pr-discovery-community-card-shell"
    :class="{
      'pr-discovery-community-card-shell--flash': autoExpandHighlightActive,
    }"
    data-testid="prd.community-card"
  >
    <PuCard
      as="section"
      class="pr-discovery-community-card pr-discovery-community-card--list"
      :title="cardTitle"
      :subtitle="description"
      :toggle-label="cardTitle"
      :default-expanded="cardDefaultExpanded"
      :expanded-reset-key="cardResetKey"
      collapsible
      data-region="pr-discovery-community"
      variant="outline"
    >
      <div class="pr-discovery-community-card__body">
        <img
          v-if="normalizedQrCodeUrl"
          :src="normalizedQrCodeUrl"
          :alt="qrAlt"
          class="pr-discovery-community-card__qr"
        />
        <p v-else class="pr-discovery-community-card__missing">
          {{ t("prDiscovery.typeDetail.communityQrMissing") }}
        </p>
      </div>
    </PuCard>
  </div>

  <article
    v-else
    class="pr-discovery-community-card pr-discovery-community-card--card"
    data-region="pr-discovery-community"
    data-testid="prd.community-card"
  >
    <div class="pr-discovery-community-card__summary">
      <span class="pr-discovery-community-card__kicker">
        {{ cardTitle }}
      </span>
      <span class="pr-discovery-community-card__description">
        {{ description }}
      </span>
    </div>

    <div class="pr-discovery-community-card__body">
      <img
        v-if="normalizedQrCodeUrl"
        :src="normalizedQrCodeUrl"
        :alt="qrAlt"
        class="pr-discovery-community-card__qr"
      />
      <p v-else class="pr-discovery-community-card__missing">
        {{ t("prDiscovery.typeDetail.communityQrMissing") }}
      </p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { PuCard } from "@partner-up-dev/design-web";
import { computed, toRef } from "vue";
import { useI18n } from "vue-i18n";
import { normalizeCommunityQrUrl } from "@/domains/pr/model/pr-type-community";
import { usePuCardAttention } from "@/domains/pr/ui/discovery/card/usePuCardAttention";

const props = withDefaults(
  defineProps<{
    type?: number | string;
    typeTitle: string;
    qrCodeUrl?: string | null;
    defaultExpanded?: boolean;
    autoExpandContextKey?: string | number | null;
    variant?: "list" | "card";
  }>(),
  {
    type: undefined,
    qrCodeUrl: null,
    defaultExpanded: false,
    autoExpandContextKey: null,
    variant: "list",
  },
);

const { t } = useI18n();
const { autoExpandHighlightActive, cardDefaultExpanded, cardResetKey } = usePuCardAttention({
  defaultExpanded: toRef(props, "defaultExpanded"),
  autoExpandContextKey: toRef(props, "autoExpandContextKey"),
});

const qrAlt = computed(() =>
  t("prDiscovery.typeDetail.communityQrAlt", {
    typeTitle: props.typeTitle.trim(),
  }),
);
const normalizedQrCodeUrl = computed(() => normalizeCommunityQrUrl(props.qrCodeUrl));
const cardTitle = computed(() => {
  const title = props.typeTitle.trim();
  return title.length > 0 ? `${title}群` : t("prDiscovery.typeDetail.communityTitle");
});
const description = computed(() => t("prDiscovery.typeDetail.communityDescription"));
</script>

<style lang="scss" scoped>
.pr-discovery-community-card--card {
  padding: var(--sys-spacing-medium);
  border-radius: var(--sys-radius-large);
  background: var(--sys-color-surface-container);
  border: 1px solid var(--sys-color-outline-variant);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.pr-discovery-community-card-shell :deep(.pr-discovery-community-card--list) {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.pr-discovery-community-card-shell
  :deep(.pr-discovery-community-card--list)::before {
  content: "";
  position: absolute;
  inset: 0;
  background: transparent;
  pointer-events: none;
  z-index: 0;
}

.pr-discovery-community-card-shell
  :deep(.pr-discovery-community-card--list > .pu-card__header),
.pr-discovery-community-card-shell
  :deep(.pr-discovery-community-card--list > .pu-card__body) {
  position: relative;
  z-index: 1;
}

.pr-discovery-community-card-shell--flash
  :deep(.pr-discovery-community-card--list)::before {
  animation: community-card-surface-flash 900ms ease-in-out 1;
}

.pr-discovery-community-card__summary {
  display: grid;
  gap: var(--sys-spacing-xsmall);
}

.pr-discovery-community-card__kicker {
  @include mx.pu-font(section);
  color: var(--sys-color-on-surface);
}

.pr-discovery-community-card__description {
  @include mx.pu-font(support);
  color: var(--sys-color-on-surface-variant);
}

.pr-discovery-community-card__body {
  display: grid;
  justify-items: center;
}

.pr-discovery-community-card__qr {
  display: block;
  width: min(100%, 220px);
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: var(--sys-radius-medium);
}

.pr-discovery-community-card__missing {
  @include mx.pu-font(body);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

@keyframes community-card-surface-flash {
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
