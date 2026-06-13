<template>
  <PuPageScaffold class="route-application-page">
    <template #header>
      <PageHeader
        :title="t('routeApplicationPage.title')"
        :subtitle="t('routeApplicationPage.subtitle')"
        :back-fallback-to="backFallbackTo"
      />
    </template>

    <div class="route-application-page__body">
      <PuInlineNotice
        v-if="submitSuccessTitle"
        tone="success"
        :message="submitSuccessTitle"
      />
      <ErrorToast v-if="pageError" :message="pageError" persistent />

      <PuCard as="section" gap="md">
        <form class="application-form" @submit.prevent="handleSubmit">
          <PuFormItem
            :label="t('routeApplicationPage.routeLabel')"
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

          <Button
            appearance="rect"
            size="lg"
            type="submit"
            :disabled="!canSubmit"
            :loading="submitMutation.isPending.value"
          >
            {{ t("routeApplicationPage.submitAction") }}
          </Button>
        </form>
      </PuCard>

      <PuCard as="section" gap="md">
        <div class="section-header">
          <div>
            <h2>{{ t("routeApplicationPage.mineTitle") }}</h2>
            <p>{{ t("routeApplicationPage.mineSubtitle") }}</p>
          </div>
        </div>

        <PuLoadingState
          v-if="applicationsQuery.isLoading.value"
          :message="t('common.loading')"
        />
        <p v-else-if="applications.length === 0" class="empty-text">
          {{ t("routeApplicationPage.emptyMine") }}
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
              <p class="application-card__meta">
                {{ formatCreatedAt(application.createdAt) }}
              </p>
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
import { computed, onMounted, ref } from "vue";
import { useRoute, type RouteLocationRaw } from "vue-router";
import { useI18n } from "vue-i18n";
import type { PRRoute } from "@partner-up-dev/backend";
import { PuCard, PuFormItem, PuInlineNotice, PuLoadingState, PuPageScaffold, PuTag } from "@partner-up-dev/design-web";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import Button from "@/shared/ui/actions/Button.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import {
  createEmptyRouteDraft,
  getRouteValidationIssue,
  normalizeRouteForSubmit,
  buildRouteSummary,
  type Route,
  type RouteValidationIssue,
} from "@/domains/route/model/route";
import RouteEditor from "@/domains/route/ui/RouteEditor.vue";
import RouteMap from "@/domains/route/ui/RouteMap.vue";
import {
  useMyAnchorEventRouteApplications,
  useSubmitAnchorEventRouteApplication,
} from "@/domains/event/queries/useRouteApplications";
import { ensureAuthSessionBootstrapped } from "@/processes/auth/useAuthSessionBootstrap";

type RouteApplicationStatus = "PENDING" | "ACCEPTED" | "REJECTED";

const { t } = useI18n();
const route = useRoute();
const sessionReady = ref(false);
const routeDraft = ref<Route>(createEmptyRouteDraft());
const submitSuccessTitle = ref<string | null>(null);

const applicationsQuery = useMyAnchorEventRouteApplications(sessionReady);
const submitMutation = useSubmitAnchorEventRouteApplication();

const fromEventQuery = computed(() => {
  const value = route.query.fromEvent;
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return value;
  }
  return null;
});

const eventId = computed(() =>
  fromEventQuery.value ? Number(fromEventQuery.value) : null,
);

const backFallbackTo = computed<RouteLocationRaw>(() =>
  fromEventQuery.value
    ? {
        name: "anchor-event-landing",
        params: {
          eventId: fromEventQuery.value,
        },
      }
    : { name: "me" },
);

const applications = computed(() => {
  const source = applicationsQuery.data.value ?? [];
  return eventId.value === null
    ? source
    : source.filter((application) => application.anchorEventId === eventId.value);
});
const normalizedRoute = computed(() => normalizeRouteForSubmit(routeDraft.value));
const routeValidationIssue = computed(() =>
  getRouteValidationIssue(normalizedRoute.value),
);
const canSubmit = computed(
  () =>
    eventId.value !== null &&
    normalizedRoute.value !== null &&
    routeValidationIssue.value === null &&
    !submitMutation.isPending.value,
);
const routeHint = computed(() =>
  routeValidationIssue.value === null
    ? t("routeApplicationPage.routeReady")
    : t("routeApplicationPage.routeHint"),
);
const routeError = computed<string | undefined>(() =>
  routeValidationIssue.value === null
    ? undefined
    : routeValidationMessage(routeValidationIssue.value),
);
const pageError = computed(() => {
  if (eventId.value === null) {
    return t("routeApplicationPage.missingEvent");
  }

  const candidates = [
    applicationsQuery.error.value,
    submitMutation.error.value,
  ];
  const first = candidates.find((candidate) => candidate instanceof Error);
  return first instanceof Error ? first.message : null;
});

const handleRouteChange = (value: Route) => {
  routeDraft.value = value;
};

const handleSubmit = async () => {
  const routeForSubmit = normalizedRoute.value;
  if (!canSubmit.value || eventId.value === null || routeForSubmit === null) {
    return;
  }

  const submitted = await submitMutation.mutateAsync({
    eventId: eventId.value,
    route: routeForSubmit as PRRoute,
  });
  submitSuccessTitle.value = t("routeApplicationPage.submitSuccess", {
    title: routeSummary(submitted.route),
  });
  routeDraft.value = createEmptyRouteDraft();
};

const routeValidationMessage = (issue: RouteValidationIssue): string => {
  if (issue === "min-points") {
    return t("routeApplicationPage.validation.minPoints");
  }
  if (issue === "name-required") {
    return t("routeApplicationPage.validation.nameRequired");
  }
  return t("routeApplicationPage.validation.coordinateRequired");
};

const routeSummary = (value: PRRoute): string =>
  buildRouteSummary(value) ?? t("routeApplicationPage.unnamedRoute");

const statusLabel = (status: RouteApplicationStatus): string =>
  t(`routeApplicationPage.status.${status}`);

const statusTagTone = (
  status: RouteApplicationStatus,
): "primary" | "secondary" | "danger" =>
  status === "ACCEPTED"
    ? "primary"
    : status === "REJECTED"
      ? "danger"
      : "secondary";

const formatCreatedAt = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("zh-CN", {
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

.section-header {
  h2,
  p {
    margin: 0;
  }

  h2 {
    @include mx.pu-font(section);
  }

  p {
    margin-top: var(--sys-spacing-xsmall);
    @include mx.pu-font(body);
    color: var(--sys-color-on-surface-variant);
  }
}

.empty-text {
  margin: 0;
  @include mx.pu-font(body);
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

.application-card__map :deep(.map-shell--inline),
.application-card__map :deep(.route-map__fallback) {
  height: 100%;
  min-height: 100%;
}

.application-card__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);

  h3 {
    margin: 0;
    @include mx.pu-font(section);
    overflow-wrap: anywhere;
  }
}

.application-card__meta,
.application-card__reason {
  margin: 0;
  @include mx.pu-font(support);
  color: var(--sys-color-on-surface-variant);
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
