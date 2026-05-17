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
              :route="application.route"
              :interactive="false"
              :fit-padding="24"
              :max-zoom="15"
              variant="inline"
            />

            <div class="route-application-card__body">
              <div class="route-application-card__header">
                <div>
                  <h3>{{ routeSummary(application.route) }}</h3>
                  <p>{{ formatCreatedAt(application.createdAt) }}</p>
                </div>
                <Chip
                  :tone="statusChipTone(application.status)"
                  size="sm"
                >
                  {{ statusLabel(application.status) }}
                </Chip>
              </div>

              <p
                v-if="application.rejectReason"
                class="route-application-card__reason"
              >
                {{ application.rejectReason }}
              </p>

              <div
                v-if="application.status === 'PENDING'"
                class="route-application-card__review"
              >
                <textarea
                  class="route-application-card__textarea"
                  :placeholder="
                    t('adminAnchorEvents.routeApplicationRejectPlaceholder')
                  "
                  rows="2"
                  :value="rejectReasonDraft(application.id)"
                  @input="handleRejectReasonInput(application.id, $event)"
                ></textarea>
                <div class="route-application-card__actions">
                  <Button
                    appearance="pill"
                    size="sm"
                    type="button"
                    :disabled="disabled"
                    @click="$emit('accept', application.id)"
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
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { PRRoute } from "@partner-up-dev/backend";
import Button from "@/shared/ui/actions/Button.vue";
import Chip from "@/shared/ui/display/Chip.vue";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import BentoLayout from "@/domains/admin/ui/layout/BentoLayout.vue";
import type { AdminRouteApplication } from "@/domains/admin/queries/useAdminAnchorEvents";
import { buildRouteSummary } from "@/domains/route/model/route";
import RouteMap from "@/domains/route/ui/RouteMap.vue";

type RouteApplicationStatus = "PENDING" | "ACCEPTED" | "REJECTED";

const props = defineProps<{
  applications: readonly AdminRouteApplication[];
  selectedEventId: number | null;
  disabled: boolean;
}>();

defineEmits<{
  accept: [applicationId: number];
  reject: [payload: { applicationId: number; rejectReason: string | null }];
}>();

const { t } = useI18n();
const rejectReasons = ref<Record<number, string>>({});

const visibleApplications = computed(() =>
  props.selectedEventId === null
    ? []
    : props.applications.filter(
        (application) => application.anchorEventId === props.selectedEventId,
      ),
);

const routeSummary = (route: PRRoute): string =>
  buildRouteSummary(route) ?? t("adminAnchorEvents.routeSummaryFallback");

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

const statusChipTone = (
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
.route-application-card__review {
  display: flex;
  flex-direction: column;
}

.anchor-event-route-applications-section,
.route-application-list,
.route-application-card__body,
.route-application-card__review {
  gap: var(--sys-spacing-medium);
}

.empty-text {
  margin: 0;
  @include mx.pu-font(body-medium);
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
    @include mx.pu-font(title-small);
    overflow-wrap: anywhere;
  }

  p {
    margin-top: var(--sys-spacing-xsmall);
    @include mx.pu-font(body-small);
    color: var(--sys-color-on-surface-variant);
  }
}

.route-application-card__reason {
  margin: 0;
  @include mx.pu-font(body-small);
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
