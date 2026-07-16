<template>
  <PuPageScaffold content-placement="center" class="about-page">
    <template #pageHeader>
      <PuHeader
        :title="t('aboutPage.title')"
        :subtitle="t('aboutPage.description')"
        title-as="h1"
      >
        <template #leading>
          <PuButton
            tone="neutral"
            variant="ghost"
            size="sm"
            :aria-label="t('common.backToHome')"
            @click="handleBack"
          >
            <template #leading>
              <span class="i-mdi-arrow-left" aria-hidden="true"></span>
            </template>
          </PuButton>
        </template>
      </PuHeader>
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

      <PRTypeCommunityDirectorySection />

      <section class="about-item about-follow-section">
        <PuButton shape="pill" @click="showOfficialAccountQrModal = true">
          {{ t("home.landing.officialAccountAction") }}
        </PuButton>
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
  </PuPageScaffold>
</template>

<script setup lang="ts">
import { PuButton, PuHeader, PuPageScaffold } from "@partner-up-dev/design-web";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import PRTypeCommunityDirectorySection from "@/domains/pr/ui/discovery/PRTypeCommunityDirectorySection.vue";
import { frontendBuildInfo } from "@/shared/meta/build-info";
import { useBackendBuildMetadata } from "@/shared/meta/queries/useBackendBuildMetadata";
import { useFallbackBack } from "@/shared/routing/useFallbackBack";
import OfficialAccountQrModal from "@/shared/wechat/OfficialAccountQrModal.vue";

const { t } = useI18n();
const { handleBack } = useFallbackBack();
const backendBuildMetadataQuery = useBackendBuildMetadata();
const showOfficialAccountQrModal = ref(false);

const repositoryUrl = computed(
  () => backendBuildMetadataQuery.data.value?.repositoryUrl ?? frontendBuildInfo.repositoryUrl,
);

const frontendCommitHash = computed(() => frontendBuildInfo.frontendCommitHash);

const backendCommitHash = computed(() => {
  if (backendBuildMetadataQuery.isLoading.value) {
    return t("common.loading");
  }

  return backendBuildMetadataQuery.data.value?.backendCommitHash ?? t("aboutPage.unknownValue");
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

.about-follow-section {
  display: grid;
  gap: var(--sys-spacing-small);
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
