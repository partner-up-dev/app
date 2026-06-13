<template>
  <section
    id="anchor-event-route-applications"
    class="anchor-event-route-applications-section"
    data-testid="admin-anchor-event.section.route-applications"
  >
    <BentoLayout>
      <BentoItem
        :title="t('adminAnchorEvents.routeApplicationsTitle')"
        span="full"
      >
        <p v-if="selectedEventId === null" class="empty-text">
          {{ t("adminAnchorEvents.selectEventForRouteApplicationsHint") }}
        </p>
        <p v-else-if="visibleApplications.length === 0" class="empty-text">
          {{ t("adminAnchorEvents.emptyRouteApplications") }}
        </p>
        <div v-else class="route-application-list">
          <article
            v-for="application in visibleApplications"
            :key="application.id"
            class="route-application-card"
          >
            <RouteMap
              class="route-application-card__map"
              :route="displayRoute(application)"
              :interactive="false"
              :fit-padding="24"
              :max-zoom="15"
              variant="inline"
            />

            <div class="route-application-card__body">
              <div class="route-application-card__header">
                <div>
                  <h3>{{ routeSummary(displayRoute(application)) }}</h3>
                  <p>{{ formatCreatedAt(application.createdAt) }}</p>
                </div>
                <PuTag
                  :tone="statusTagTone(application.status)"
                  :text="statusLabel(application.status)"
                  size="sm"
                  variant="soft"
                  shape="pill"
                />
              </div>

              <p
                v-if="application.rejectReason"
                class="route-application-card__reason"
              >
                {{ application.rejectReason }}
              </p>

              <div
                v-if="application.status === 'PENDING'"
                class="route-application-card__editor"
              >
                <p class="route-application-card__hint">
                  {{ t("adminAnchorEvents.routeApplicationEditHint") }}
                </p>
                <RouteEditor
                  :model-value="routeDraft(application)"
                  variant="inline"
                  data-testid="admin-anchor-event.route-application.editor"
                  @update:model-value="
                    updateRouteDraft(application.id, $event)
                  "
                />
                <p
                  v-if="routeValidationMessage(application.id)"
                  class="route-application-card__validation"
                >
                  {{ routeValidationMessage(application.id) }}
                </p>
              </div>

              <div
                v-if="application.status === 'PENDING'"
                class="route-application-card__review"
              >
                <textarea
                  class="route-application-card__textarea"
                  :placeholder="
                    t('adminAnchorEvents.routeApplicationRejectPlaceholder')
                  "
                  :value="rejectReasonDraft(application.id)"
                  @input="handleRejectReasonInput(application.id, $event)"
                ></textarea>
                <div class="route-application-card__actions">
                  <Button
                    appearance="pill"
                    size="sm"
                    type="button"
                    :disabled="disabled || !canAccept(application.id)"
                    @click="handleAccept(application)"
                  >
                    {{ t("adminAnchorEvents.acceptRouteApplicationAction") }}
                  </Button>
                  <Button
                    appearance="pill"
                    tone="outline"
                    size="sm"
                    type="button"
                    :disabled="disabled"
                    @click="
                      $emit('reject', {
                        applicationId: application.id,
                        rejectReason: rejectReasonDraft(application.id),
                      })
                    "
                  >
                    {{ t("adminAnchorEvents.rejectRouteApplicationAction") }}
                  </Button>
                </div>
              </div>
            </div>
          </article>
        </div>
      </BentoItem>
    </BentoLayout>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { PRRoute } from "@partner-up-dev/backend";
import Button from "@/shared/ui/actions/Button.vue";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import BentoLayout from "@/domains/admin/ui/layout/BentoLayout.vue";
import type { AdminRouteApplication } from "@/domains/admin/queries/useAdminAnchorEvents";
import {
  buildRouteSummary,
  cloneRoute,
  createEmptyRouteDraft,
  getRouteValidationIssue,
  normalizeRouteForSubmit,
  type Route,
  type RouteValidationIssue,
} from "@/domains/route/model/route";
import RouteEditor from "@/domains/route/ui/RouteEditor.vue";
import RouteMap from "@/domains/route/ui/RouteMap.vue";
import { PuTag } from "@partner-up-dev/design-web";

type RouteApplicationStatus = "PENDING" | "ACCEPTED" | "REJECTED";

const props = defineProps<{
  applications: readonly AdminRouteApplication[];
  selectedEventId: number | null;
  disabled: boolean;
}>();

const emit = defineEmits<{
  accept: [payload: { applicationId: number; route: PRRoute }];
  reject: [payload: { applicationId: number; rejectReason: string | null }];
}>();

const { t } = useI18n();
const rejectReasons = ref<Record<number, string>>({});
const routeDrafts = ref<Record<number, Route>>({});

const visibleApplications = computed(() =>
  props.selectedEventId === null
    ? []
    : props.applications.filter(
        (application) => application.anchorEventId === props.selectedEventId,
      ),
);

const routeSummary = (route: PRRoute): string =>
  buildRouteSummary(route) ?? t("adminAnchorEvents.routeSummaryFallback");

watch(
  () => props.applications,
  (applications) => {
    const nextDrafts: Record<number, Route> = { ...routeDrafts.value };
    const applicationIds = new Set<number>();
    for (const application of applications) {
      applicationIds.add(application.id);
      if (
        nextDrafts[application.id] === undefined ||
        application.status !== "PENDING"
      ) {
        nextDrafts[application.id] =
          cloneRoute(application.route) ?? createEmptyRouteDraft();
      }
    }

    for (const draftId of Object.keys(nextDrafts)) {
      if (!applicationIds.has(Number(draftId))) {
        delete nextDrafts[Number(draftId)];
      }
    }

    routeDrafts.value = nextDrafts;
  },
  { immediate: true },
);

const routeDraft = (application: AdminRouteApplication): Route =>
  routeDrafts.value[application.id] ??
  cloneRoute(application.route) ??
  createEmptyRouteDraft();

const displayRoute = (application: AdminRouteApplication): PRRoute =>
  (application.status === "PENDING"
    ? routeDraft(application)
    : application.route) as PRRoute;

const updateRouteDraft = (applicationId: number, route: Route): void => {
  routeDrafts.value = {
    ...routeDrafts.value,
    [applicationId]: cloneRoute(route) ?? createEmptyRouteDraft(),
  };
};

const routeIssue = (applicationId: number): RouteValidationIssue | null =>
  getRouteValidationIssue(routeDrafts.value[applicationId]);

const routeValidationMessage = (applicationId: number): string | null => {
  const issue = routeIssue(applicationId);
  if (issue === null) {
    return null;
  }

  const keyByIssue: Record<RouteValidationIssue, string> = {
    "min-points": "routeApplicationPage.validation.minPoints",
    "name-required": "routeApplicationPage.validation.nameRequired",
    "coordinate-required": "routeApplicationPage.validation.coordinateRequired",
  };
  return t(keyByIssue[issue]);
};

const normalizedRouteDraft = (applicationId: number): PRRoute | null => {
  const route = routeDrafts.value[applicationId];
  if (getRouteValidationIssue(route) !== null) {
    return null;
  }
  return normalizeRouteForSubmit(route) as PRRoute | null;
};

const canAccept = (applicationId: number): boolean =>
  normalizedRouteDraft(applicationId) !== null;

const handleAccept = (application: AdminRouteApplication): void => {
  const route = normalizedRouteDraft(application.id);
  if (route === null) {
    return;
  }
  emit("accept", {
    applicationId: application.id,
    route,
  });
};

const rejectReasonDraft = (applicationId: number): string =>
  rejectReasons.value[applicationId] ?? "";

const handleRejectReasonInput = (applicationId: number, event: Event) => {
  if (!(event.target instanceof HTMLTextAreaElement)) {
    return;
  }
  rejectReasons.value = {
    ...rejectReasons.value,
    [applicationId]: event.target.value,
  };
};

const statusLabel = (status: RouteApplicationStatus): string =>
  t(`adminAnchorEvents.routeApplicationStatus.${status}`);

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
</script>

<style scoped lang="scss">
.anchor-event-route-applications-section,
.route-application-list,
.route-application-card__body,
.route-application-card__editor,
.route-application-card__review {
  display: flex;
  flex-direction: column;
}

.anchor-event-route-applications-section,
.route-application-list,
.route-application-card__body,
.route-application-card__editor,
.route-application-card__review {
  gap: var(--sys-spacing-medium);
}

.empty-text {
  margin: 0;
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

.route-application-card {
  display: grid;
  grid-template-columns: minmax(12rem, 18rem) minmax(0, 1fr);
  gap: var(--sys-spacing-medium);
  padding: var(--sys-spacing-medium);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
}

.route-application-card__map {
  min-height: 11rem;
  aspect-ratio: 16 / 10;
}

.route-application-card__map :deep(.map-shell--inline),
.route-application-card__map :deep(.route-map__fallback) {
  height: 100%;
  min-height: 100%;
}

.route-application-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sys-spacing-small);

  h3,
  p {
    margin: 0;
  }

  h3 {
    @include mx.pu-font(section);
    overflow-wrap: anywhere;
  }

  p {
    margin-top: var(--sys-spacing-xsmall);
    @include mx.pu-font(support);
    color: var(--sys-color-on-surface-variant);
  }
}

.route-application-card__reason {
  margin: 0;
  @include mx.pu-font(support);
  color: var(--sys-color-error);
}

.route-application-card__hint,
.route-application-card__validation {
  margin: 0;
  @include mx.pu-font(support);
}

.route-application-card__hint {
  color: var(--sys-color-on-surface-variant);
}

.route-application-card__validation {
  color: var(--sys-color-error);
}

.route-application-card__textarea {
  width: 100%;
  resize: vertical;
  padding: var(--sys-spacing-small) var(--sys-spacing-medium);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}

.route-application-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-small);
}

@media (max-width: 720px) {
  .route-application-card {
    grid-template-columns: 1fr;
  }
}
</style>
