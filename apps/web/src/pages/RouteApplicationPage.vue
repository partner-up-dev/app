<template>
  <PuPageScaffold class="route-application-page" data-page="route-application">
    <template #pageHeader>
      <PuHeader
        :title="t('prAuthoring.routeApplicationTitle')"
        :subtitle="t('prAuthoring.routeApplicationSubtitle')"
        title-as="h1"
      >
        <template #leading>
          <PuButton
            tone="neutral"
            variant="ghost"
            size="sm"
            :aria-label="t('prAuthoring.routeApplicationBackAction')"
            @click="handleBack"
          >
            <template #leading><span class="i-mdi-arrow-left" aria-hidden="true" /></template>
          </PuButton>
        </template>
      </PuHeader>
    </template>

    <div class="route-application-page__body">
      <PuInlineNotice v-if="submitSuccessTitle" tone="success" :message="submitSuccessTitle" />
      <PuInlineNotice v-if="pageError" tone="error" :message="pageError" />
      <PuInlineNotice
        v-if="!type"
        tone="warning"
        :message="t('prAuthoring.routeApplicationMissingType')"
        data-testid="prd.route-application.missing-type"
      />

      <PuCard v-if="type" as="section" gap="md">
        <form class="application-form" @submit.prevent="handleSubmit">
          <PuFormItem
            :label="t('prAuthoring.routeApplicationRouteLabel')"
            :hint="routeHint"
            :error="routeError"
            required
          >
            <RouteEditor
              :model-value="routeDraft"
              variant="inline"
              @update:model-value="handleRouteChange"
            />
          </PuFormItem>
          <PuButton
            shape="rect"
            size="lg"
            :action="{ native: 'submit' }"
            :disabled="!canSubmit"
            :loading="submitMutation.isPending.value"
            data-testid="prd.route-application.submit"
          >
            {{ t("prAuthoring.routeApplicationSubmitAction") }}
          </PuButton>
        </form>
      </PuCard>

      <PuCard v-if="type" as="section" gap="md">
        <div class="section-header">
          <h2>{{ t("prAuthoring.routeApplicationMineTitle") }}</h2>
          <p>{{ t("prAuthoring.routeApplicationMineSubtitle") }}</p>
        </div>
        <PuLoadingState v-if="applicationsQuery.isLoading.value" :message="t('common.loading')" />
        <p v-else-if="applications.length === 0" class="empty-text">
          {{ t("prAuthoring.routeApplicationEmptyMine") }}
        </p>
        <div v-else class="application-list">
          <article
            v-for="application in applications"
            :key="application.id"
            class="application-card"
          >
            <RouteMap
              class="application-card__map"
              :route="application.route"
              :interactive="false"
              :fit-padding="20"
              :max-zoom="15"
              variant="inline"
            />
            <div class="application-card__body">
              <div class="application-card__title-row">
                <h3>{{ routeSummary(application.route) }}</h3>
                <PuTag
                  :tone="statusTagTone(application.status)"
                  :text="statusLabel(application.status)"
                  size="sm"
                  variant="soft"
                  shape="pill"
                />
              </div>
              <p class="application-card__meta">{{ formatCreatedAt(application.createdAt) }}</p>
              <p v-if="application.rejectReason" class="application-card__reason">
                {{ application.rejectReason }}
              </p>
            </div>
          </article>
        </div>
      </PuCard>
    </div>
  </PuPageScaffold>
</template>

<script setup lang="ts">
import type { PRRoute } from "@partner-up-dev/backend/contracts";
import {
  PuButton,
  PuCard,
  PuFormItem,
  PuHeader,
  PuInlineNotice,
  PuLoadingState,
  PuPageScaffold,
  PuTag,
} from "@partner-up-dev/design-web";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import {
  type PRAuthoringRouteApplicationStatus,
  useMyPRAuthoringRouteApplications,
  useSubmitPRAuthoringRouteApplication,
} from "@/domains/pr/queries/usePRAuthoringRouteApplications";
import {
  buildRouteSummary,
  createEmptyRouteDraft,
  getRouteValidationIssue,
  normalizeRouteForSubmit,
  type Route,
  type RouteValidationIssue,
} from "@/domains/route/model/route";
import RouteEditor from "@/domains/route/ui/RouteEditor.vue";
import RouteMap from "@/domains/route/ui/RouteMap.vue";
import { ensureAuthSessionBootstrapped } from "@/processes/auth/useAuthSessionBootstrap";
import { useFallbackBack } from "@/shared/routing/useFallbackBack";

const { t } = useI18n();
const route = useRoute();
const type = computed(() => {
  const value = route.query.type;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
});
const backFallbackTo = computed(() =>
  type.value ? { name: "pr-discovery", query: { type: type.value } } : { name: "pr-discovery" },
);
const { handleBack } = useFallbackBack(backFallbackTo);
const sessionReady = ref(false);
const routeDraft = ref<Route>(createEmptyRouteDraft());
const submitSuccessTitle = ref<string | null>(null);
const applicationsQuery = useMyPRAuthoringRouteApplications(type, sessionReady);
const submitMutation = useSubmitPRAuthoringRouteApplication();
const applications = computed(() => applicationsQuery.data.value ?? []);
const normalizedRoute = computed(() => normalizeRouteForSubmit(routeDraft.value));
const routeValidationIssue = computed(() => getRouteValidationIssue(normalizedRoute.value));
const canSubmit = computed(
  () =>
    Boolean(type.value) &&
    normalizedRoute.value !== null &&
    routeValidationIssue.value === null &&
    !submitMutation.isPending.value,
);
const routeHint = computed(() =>
  routeValidationIssue.value === null
    ? t("prAuthoring.routeApplicationRouteReady")
    : t("prAuthoring.routeApplicationRouteHint"),
);
const routeError = computed<string | undefined>(() =>
  routeValidationIssue.value ? routeValidationMessage(routeValidationIssue.value) : undefined,
);
const pageError = computed(
  () =>
    [applicationsQuery.error.value, submitMutation.error.value].find(
      (error): error is Error => error instanceof Error,
    )?.message ?? null,
);
const handleRouteChange = (value: Route) => {
  routeDraft.value = value;
};
const handleSubmit = async () => {
  const routeForSubmit = normalizedRoute.value;
  if (!type.value || !canSubmit.value || !routeForSubmit) return;
  const submitted = await submitMutation.mutateAsync({
    type: type.value,
    route: routeForSubmit as PRRoute,
  });
  submitSuccessTitle.value = t("prAuthoring.routeApplicationSubmitSuccess");
  routeDraft.value = createEmptyRouteDraft();
  void submitted;
};
const routeValidationMessage = (issue: RouteValidationIssue): string =>
  issue === "min-points"
    ? t("prAuthoring.routeApplicationValidation.minPoints")
    : issue === "name-required"
      ? t("prAuthoring.routeApplicationValidation.nameRequired")
      : t("prAuthoring.routeApplicationValidation.coordinateRequired");
const routeSummary = (value: PRRoute): string =>
  buildRouteSummary(value) ?? t("prAuthoring.typeFallback");
const statusLabel = (status: PRAuthoringRouteApplicationStatus): string =>
  t(`prAuthoring.routeApplicationStatus.${status}`);
const statusTagTone = (
  status: PRAuthoringRouteApplicationStatus,
): "primary" | "secondary" | "danger" =>
  status === "ACCEPTED" ? "primary" : status === "REJECTED" ? "danger" : "secondary";
const formatCreatedAt = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("zh-CN", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
};
onMounted(async () => {
  await ensureAuthSessionBootstrapped();
  sessionReady.value = true;
});
</script>

<style scoped lang="scss">
.route-application-page__body,
.application-form,
.application-list,
.application-card__body {
  display: flex;
  flex-direction: column;
}
.route-application-page__body {
  gap: var(--sys-spacing-large);
}
.application-form,
.application-list,
.application-card__body {
  gap: var(--sys-spacing-medium);
}
.section-header h2,
.section-header p,
.empty-text,
.application-card__meta,
.application-card__reason {
  margin: 0;
}
.section-header p {
  margin-top: var(--sys-spacing-xsmall);
  color: var(--sys-color-on-surface-variant);
}
.empty-text,
.application-card__meta,
.application-card__reason {
  color: var(--sys-color-on-surface-variant);
}
.application-card {
  display: grid;
  grid-template-columns: 8rem minmax(0, 1fr);
  gap: var(--sys-spacing-small);
  align-items: center;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
}
.application-card__map {
  width: 8rem;
  min-height: 5rem;
  aspect-ratio: 16 / 10;
}
.application-card__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
}
.application-card__title-row h3 {
  margin: 0;
  overflow-wrap: anywhere;
}
.application-card__reason {
  color: var(--sys-color-error);
}
@media (max-width: 640px) {
  .application-card {
    grid-template-columns: 1fr;
  }
  .application-card__map {
    width: 100%;
    aspect-ratio: 16 / 9;
  }
}
</style>
