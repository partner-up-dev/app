<template>
  <PageScaffoldFlow class="my-prs-page">
    <template #header>
      <PageHeader
        :title="t('myPrsPage.title')"
        :subtitle="t('myPrsPage.description')"
      />
    </template>

    <div class="my-prs-page__body">
      <p v-if="!userSessionStore.isAuthenticated" class="my-prs-page__auth-hint">
        {{ t("myPrsPage.authHint") }}
      </p>

      <section class="my-prs-page__section">
        <div class="my-prs-page__section-header">
          <h2>{{ t("myPrsPage.createdTitle") }}</h2>
          <span class="my-prs-page__count">{{ createdItems.length }}</span>
        </div>

        <LoadingIndicator
          v-if="createdQuery.isLoading.value"
          :message="t('myPrsPage.loading')"
        />
        <p v-else-if="createdQuery.error.value" class="my-prs-page__error">
          {{ createdErrorMessage }}
        </p>
        <p v-else-if="createdItems.length === 0" class="my-prs-page__empty">
          {{ t("myPrsPage.createdEmpty") }}
        </p>
        <ul v-else class="my-prs-page__list">
          <li v-for="item in createdItems" :key="`created-${item.id}`">
            <PRPreviewCard
              class="my-prs-page__preview-card"
              :pr-id="item.id"
            />
          </li>
        </ul>
      </section>

      <section class="my-prs-page__section">
        <div class="my-prs-page__section-header">
          <h2>{{ t("myPrsPage.joinedTitle") }}</h2>
          <span class="my-prs-page__count">{{ joinedDisplayItems.length }}</span>
        </div>

        <LoadingIndicator
          v-if="joinedQuery.isLoading.value"
          :message="t('myPrsPage.loading')"
        />
        <p v-else-if="joinedQuery.error.value" class="my-prs-page__error">
          {{ joinedErrorMessage }}
        </p>
        <p v-else-if="joinedDisplayItems.length === 0" class="my-prs-page__empty">
          {{ t("myPrsPage.joinedEmpty") }}
        </p>
        <ul v-else class="my-prs-page__list">
          <li v-for="item in joinedDisplayItems" :key="`joined-${item.id}`">
            <PRPreviewCard
              class="my-prs-page__preview-card"
              :pr-id="item.id"
            />
          </li>
        </ul>
      </section>
    </div>

    <template #footer>
      <PageFooter variant="minimal" />
    </template>
  </PageScaffoldFlow>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import PageFooter from "@/shared/ui/sections/PageFooter.vue";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import PRPreviewCard from "@/domains/pr/ui/primitives/PRPreviewCard.vue";
import PageScaffoldFlow from "@/shared/ui/layout/PageScaffoldFlow.vue";
import { useMyCreatedPRs } from "@/domains/pr/queries/useMyCreatedPRs";
import { useMyJoinedPRs } from "@/domains/pr/queries/useMyJoinedPRs";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";

const { t } = useI18n();
const userSessionStore = useUserSessionStore();
const createdQuery = useMyCreatedPRs();
const joinedQuery = useMyJoinedPRs();

const createdItems = computed(() => createdQuery.data.value ?? []);
const joinedItems = computed(() => joinedQuery.data.value ?? []);
const createdIds = computed(
  () => new Set(createdItems.value.map((item) => item.id)),
);

const joinedDisplayItems = computed(() =>
  joinedItems.value.filter((item) => !createdIds.value.has(item.id)),
);

const createdErrorMessage = computed(() => {
  const error = createdQuery.error.value;
  return error instanceof Error ? error.message : t("myPrsPage.loadFailed");
});

const joinedErrorMessage = computed(() => {
  const error = joinedQuery.error.value;
  return error instanceof Error ? error.message : t("myPrsPage.loadFailed");
});

</script>

<style scoped lang="scss">
.my-prs-page__body {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-large);
}

.my-prs-page__auth-hint,
.my-prs-page__empty,
.my-prs-page__error {
  @include mx.pu-font(body);
  margin: 0;
}

.my-prs-page__auth-hint,
.my-prs-page__empty {
  color: var(--sys-color-on-surface-variant);
}

.my-prs-page__error {
  color: var(--sys-color-error);
}

.my-prs-page__section {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.my-prs-page__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  h2 {
    @include mx.pu-font(section);
    margin: 0;
    color: var(--sys-color-on-surface);
  }
}

.my-prs-page__count {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
  background: var(--sys-color-surface-container);
  border-radius: var(--sys-radius-large);
  padding: var(--sys-spacing-xsmall) var(--sys-spacing-small);
}

.my-prs-page__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.my-prs-page__preview-card {
  &:hover {
    background: var(--sys-color-surface-container);
  }
}
</style>
