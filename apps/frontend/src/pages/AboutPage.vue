<template>
  <PuPageScaffold content-placement="center" class="about-page">
    <template #header>
      <PageHeader
        :title="t('aboutPage.title')"
        :subtitle="t('aboutPage.description')"
      />
    </template>

    <section class="about-body" :aria-label="t('aboutPage.sectionTitle')">
      <dl class="about-list">
        <div class="about-item">
          <dt>{{ t("aboutPage.productNameLabel") }}</dt>
          <dd>{{ t("app.siteName") }}</dd>
        </div>

        <div class="about-item">
          <dt>{{ t("aboutPage.repositoryLabel") }}</dt>
          <dd>
            <a
              v-if="repositoryUrl"
              :href="repositoryUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="repo-link"
            >
              {{ repositoryUrl }}
            </a>
            <span v-else>{{ t("aboutPage.unknownValue") }}</span>
          </dd>
          <div class="h-2" />
          <dt>{{ t("aboutPage.frontendCommitLabel") }}</dt>
          <dd>
            <code>{{ frontendCommitHash }}</code>
          </dd>
          <div class="h-2" />
          <dt>{{ t("aboutPage.backendCommitLabel") }}</dt>
          <dd>
            <code>{{ backendCommitHash }}</code>
          </dd>
        </div>
      </dl>

      <section
        id="beta-groups"
        class="about-beta-groups about-item"
        :aria-label="t('aboutPage.betaGroupsSectionTitle')"
      >
        <div class="about-beta-groups__header">
          <h2>{{ t("aboutPage.betaGroupsTitle") }}</h2>
          <p>{{ t("aboutPage.betaGroupsDescription") }}</p>
        </div>

        <p
          v-if="anchorEventsQuery.isLoading.value"
          class="about-beta-groups__state"
        >
          {{ t("aboutPage.betaGroupsLoading") }}
        </p>
        <p
          v-else-if="anchorEventsQuery.error.value"
          class="about-beta-groups__state about-beta-groups__state--error"
        >
          {{ t("aboutPage.betaGroupsLoadFailed") }}
        </p>
        <p
          v-else-if="activeEvents.length === 0"
          class="about-beta-groups__state"
        >
          {{ t("aboutPage.betaGroupsEmpty") }}
        </p>
        <div v-else class="about-beta-groups-card">
          <div
            v-for="event in activeEvents"
            :key="event.id"
            class="about-beta-groups-row"
          >
            <span class="about-beta-groups-row__label">
              {{ event.title }}
            </span>
            <button
              type="button"
              class="about-beta-groups-row__value"
              @click="openBetaGroupModal(event.id)"
            >
              {{ t("aboutPage.betaGroupLinkAction") }}
            </button>
          </div>
        </div>

        <Button
          appearance="pill"
          type="button"
          @click="showOfficialAccountQrModal = true"
        >
          {{ t("home.landing.officialAccountAction") }}
        </Button>
      </section>

      <p
        v-if="backendBuildMetadataQuery.error.value"
        class="fetch-warning"
        role="status"
      >
        {{ t("aboutPage.backendCommitLoadFailed") }}
      </p>
    </section>

    <OfficialAccountQrModal
      :open="showOfficialAccountQrModal"
      @close="showOfficialAccountQrModal = false"
    />

    <Modal
      :open="betaGroupModalOpen"
      :title="selectedBetaGroupModalTitle"
      max-width="420px"
      @close="closeBetaGroupModal"
    >
      <div class="about-beta-group-modal">
        <p class="about-beta-group-modal__description">
          {{ t("aboutPage.betaGroupModalDescription") }}
        </p>
        <img
          v-if="selectedBetaGroupQrCodeUrl"
          :src="selectedBetaGroupQrCodeUrl"
          :alt="selectedBetaGroupQrAlt"
          class="about-beta-group-modal__qr"
        />
        <p v-else class="about-beta-group-modal__missing">
          {{ t("aboutPage.betaGroupQrMissing") }}
        </p>
      </div>
    </Modal>
  </PuPageScaffold>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import { useAnchorEvents } from "@/domains/event/queries/useAnchorEvents";
import { frontendBuildInfo } from "@/shared/meta/build-info";
import { useBackendBuildMetadata } from "@/shared/meta/queries/useBackendBuildMetadata";
import OfficialAccountQrModal from "@/shared/wechat/OfficialAccountQrModal.vue";
import Modal from "@/shared/ui/overlay/Modal.vue";
import Button from "@/shared/ui/actions/Button.vue";
import { useBodyScrollLock } from "@/shared/ui/overlay/useBodyScrollLock";
import { PuPageScaffold } from "@partner-up-dev/design-web";

const { t } = useI18n();
const backendBuildMetadataQuery = useBackendBuildMetadata();
const anchorEventsQuery = useAnchorEvents();
const showOfficialAccountQrModal = ref(false);
const selectedBetaGroupEventId = ref<number | null>(null);

const activeEvents = computed(() => anchorEventsQuery.data.value ?? []);
const selectedBetaGroupEvent = computed(
  () =>
    activeEvents.value.find(
      (event) => event.id === selectedBetaGroupEventId.value,
    ) ?? null,
);
const selectedBetaGroupModalTitle = computed(() => {
  const title = selectedBetaGroupEvent.value?.title ?? "";
  return t("aboutPage.betaGroupModalTitle", { eventTitle: title });
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

const selectedBetaGroupQrCodeUrl = computed(() =>
  normalizeHttpUrl(selectedBetaGroupEvent.value?.betaGroupQrCode),
);
const selectedBetaGroupQrAlt = computed(() =>
  t("aboutPage.betaGroupQrAlt", {
    eventTitle: selectedBetaGroupEvent.value?.title ?? "",
  }),
);
const betaGroupModalOpen = computed(
  () => selectedBetaGroupEvent.value !== null,
);

useBodyScrollLock(betaGroupModalOpen);

const openBetaGroupModal = (eventId: number): void => {
  selectedBetaGroupEventId.value = eventId;
};

const closeBetaGroupModal = (): void => {
  selectedBetaGroupEventId.value = null;
};

const repositoryUrl = computed(
  () =>
    backendBuildMetadataQuery.data.value?.repositoryUrl ??
    frontendBuildInfo.repositoryUrl,
);

const frontendCommitHash = computed(() => frontendBuildInfo.frontendCommitHash);

const backendCommitHash = computed(() => {
  if (backendBuildMetadataQuery.isLoading.value) {
    return t("common.loading");
  }

  return (
    backendBuildMetadataQuery.data.value?.backendCommitHash ??
    t("aboutPage.unknownValue")
  );
});
</script>

<style scoped lang="scss">
.about-body {
  width: min(100%, 42rem);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.about-list {
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.about-item {
  padding: var(--sys-spacing-medium);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface-container);

  dt {
    @include mx.pu-font(control);
    color: var(--sys-color-on-surface-variant);
    margin: 0 0 var(--sys-spacing-xsmall);
  }

  dd {
    margin: 0;
    @include mx.pu-font(body);
    color: var(--sys-color-on-surface);
    overflow-wrap: anywhere;
  }

  code {
    @include mx.pu-font(control);
    display: inline-block;
    padding: var(--sys-spacing-xsmall);
    border-radius: var(--sys-radius-small);
    background: var(--sys-color-surface-container-low);
    color: var(--sys-color-on-surface);
  }
}

.about-beta-groups {
  display: grid;
  gap: var(--sys-spacing-small);
  scroll-margin-top: var(--sys-spacing-large);
}

.about-beta-groups__header {
  display: grid;
  gap: var(--sys-spacing-xsmall);

  h2,
  p {
    margin: 0;
  }

  h2 {
    @include mx.pu-font(section);
    color: var(--sys-color-on-surface);
  }

  p {
    @include mx.pu-font(body);
    color: var(--sys-color-on-surface-variant);
  }
}

.about-beta-groups__kicker {
  @include mx.pu-font(control);
  color: var(--sys-color-secondary);
}

.about-beta-groups__state {
  @include mx.pu-font(body);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

.about-beta-groups__state--error {
  color: var(--sys-color-error);
}

.about-beta-groups-card {
  display: grid;
  padding: 0;
}

.about-beta-groups-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--sys-spacing-small);
  min-height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  padding: var(--sys-spacing-small) 0;
}

.about-beta-groups-row + .about-beta-groups-row {
  border-top: 1px solid var(--sys-color-outline-variant);
}

.about-beta-groups-row__label {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface);
  overflow-wrap: anywhere;
}

.about-beta-groups-row__value {
  appearance: none;
  border: 0;
  padding: var(--sys-spacing-xsmall);
  background: transparent;
  @include mx.pu-font(control);
  color: var(--sys-color-primary);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 0.14em;
}

.about-beta-groups-row__value:focus-visible {
  outline: 2px solid var(--sys-color-primary);
  outline-offset: 2px;
  border-radius: var(--sys-radius-xsmall);
}

.about-beta-group-modal {
  display: grid;
  justify-items: center;
  gap: var(--sys-spacing-small);
}

.about-beta-group-modal__description,
.about-beta-group-modal__missing {
  @include mx.pu-font(body);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
  text-align: center;
}

.about-beta-group-modal__qr {
  width: min(100%, 260px);
  border-radius: var(--sys-radius-medium);
}

.repo-link {
  color: var(--sys-color-primary);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
    border-radius: var(--sys-radius-xsmall);
  }
}

.fetch-warning {
  margin: 0;
  @include mx.pu-font(support);
  color: var(--sys-color-error);
}
</style>
