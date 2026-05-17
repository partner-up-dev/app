<template>
  <section class="route-map" :class="`route-map--${variant}`">
    <SharedMap
      v-if="hasGeometry"
      :api-key="apiKey"
      :markers="markers"
      :polylines="polylines"
      :active-geometry="activeGeometry ?? { kind: 'all' }"
      :fit-padding="fitPadding"
      :max-zoom="maxZoom"
      :interactive="interactive"
      :variant="variant"
      :hide-bottom-attribution="hideBottomAttribution"
      :loading-message="t('route.mapLoading')"
      :unavailable-message="t('route.mapUnavailable')"
      :error-message="t('route.mapFailed')"
    >
      <template #fallback>
        <div class="route-map__fallback">
          <span
            class="route-map__fallback-icon i-mdi-map-marker-path"
            aria-hidden="true"
          ></span>
          <p>{{ t("route.mapUnavailable") }}</p>
          <ol class="route-map__points">
            <li v-for="(point, index) in routePoints" :key="index">
              {{ formatPointLabel(point, index) }}
            </li>
          </ol>
        </div>
      </template>
    </SharedMap>

    <div v-else class="route-map__fallback route-map__fallback--static">
      <span
        class="route-map__fallback-icon i-mdi-map-marker-path"
        aria-hidden="true"
      ></span>
      <p>{{ t("route.noCoordinateHint") }}</p>
      <ol class="route-map__points">
        <li v-for="(point, index) in routePoints" :key="index">
          {{ formatPointLabel(point, index) }}
        </li>
      </ol>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import SharedMap from "@/shared/map/Map.vue";
import type {
  MapActiveGeometry,
  MapCoordinate,
  MapFitPadding,
  MapMarker,
  MapPolyline,
} from "@/shared/map/types";
import type { Route, RoutePoint } from "@/domains/route/model/route";
import {
  buildRouteSummary,
  pickRoutePointCoordinate,
  resolveRoutePointRole,
  toRouteMapProjection,
} from "@/domains/route/model/route";
import {
  buildTencentDrivingDirectionUrl,
  fetchTencentDrivingRoutePlans,
  type TencentDrivingRoutePlan,
} from "@/domains/route/model/route-planning";

const props = withDefaults(
  defineProps<{
    route: Route | null;
    plannedPolyline?: readonly MapCoordinate[] | null;
    planRoute?: boolean;
    planningApiKey?: string;
    activeGeometry?: MapActiveGeometry;
    fitPadding?: MapFitPadding;
    maxZoom?: number;
    apiKey?: string;
    interactive?: boolean;
    variant?: "inline" | "immersive";
    hideBottomAttribution?: boolean;
  }>(),
  {
    plannedPolyline: null,
    planRoute: true,
    planningApiKey: undefined,
    activeGeometry: null,
    fitPadding: 28,
    maxZoom: 16,
    apiKey: undefined,
    interactive: true,
    variant: "inline",
    hideBottomAttribution: false,
  },
);

const { t } = useI18n();

const planningAbortController = ref<AbortController | null>(null);
const planningStatus = ref<"idle" | "loading" | "success" | "error">("idle");
const plannedRoutes = ref<TencentDrivingRoutePlan[]>([]);

const routePoints = computed(() => props.route ?? []);
const projection = computed(() => toRouteMapProjection(props.route));
const externalPlannedPolyline = computed(() => {
  const plannedPolyline = props.plannedPolyline?.filter(
    (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng),
  );
  return plannedPolyline && plannedPolyline.length >= 2 ? plannedPolyline : null;
});

const planningApiKey = computed(() => {
  const explicit = props.planningApiKey?.trim() ?? "";
  if (explicit.length > 0) {
    return explicit;
  }
  const webServiceKey = import.meta.env.VITE_TENCENT_LBS_WEB_SERVICE_KEY?.trim();
  if (webServiceKey && webServiceKey.length > 0) {
    return webServiceKey;
  }
  return props.apiKey?.trim() || import.meta.env.VITE_TENCENT_LBS_JS_KEY?.trim() || "";
});

const planningUrl = computed(() => {
  if (!props.planRoute || externalPlannedPolyline.value) {
    return null;
  }

  return buildTencentDrivingDirectionUrl({
    route: props.route,
    apiKey: planningApiKey.value,
  });
});

const routePlanningPrimary = computed(() => plannedRoutes.value[0] ?? null);

const buildPointMarker = ({
  point,
  index,
  position,
}: {
  point: RoutePoint | null;
  index: number;
  position: MapCoordinate;
}): MapMarker => {
  const role = resolveRoutePointRole(index, routePoints.value.length);
  return {
    id: `route-point-${index}`,
    position,
    title:
      point?.name.trim() ||
      t("route.pointFallback", {
        index: index + 1,
      }),
    icon:
      role === "departure"
        ? "routeStart"
        : role === "arrival"
          ? "routeEnd"
          : "routeWaypoint",
  };
};

const markers = computed<MapMarker[]>(() => {
  const primaryPlan = routePlanningPrimary.value;
  if (!primaryPlan || primaryPlan.polyline.length < 2) {
    return projection.value.markers;
  }

  const firstPoint = primaryPlan.polyline[0];
  const lastPoint = primaryPlan.polyline[primaryPlan.polyline.length - 1];
  if (!firstPoint || !lastPoint) {
    return projection.value.markers;
  }

  const waypointMarkers = routePoints.value.slice(1, -1).map((point, index) => {
    const waypointFromPlan = primaryPlan.waypoints[index]?.location;
    return buildPointMarker({
      point,
      index: index + 1,
      position: waypointFromPlan ?? pickRoutePointCoordinate(point) ?? firstPoint,
    });
  });

  return [
    buildPointMarker({
      point: routePoints.value[0] ?? null,
      index: 0,
      position: firstPoint,
    }),
    ...waypointMarkers,
    buildPointMarker({
      point: routePoints.value[routePoints.value.length - 1] ?? null,
      index: routePoints.value.length - 1,
      position: lastPoint,
    }),
  ];
});

const polylines = computed<MapPolyline[]>(() => {
  if (externalPlannedPolyline.value) {
    return [
      {
        id: "route",
        path: externalPlannedPolyline.value,
        title: buildRouteSummary(props.route) ?? undefined,
        tone: "routePrimary",
      },
    ];
  }

  const plannedPolylines = plannedRoutes.value
    .map((plan, index): MapPolyline | null =>
      plan.polyline.length >= 2
        ? {
            id: plan.id,
            path: plan.polyline,
            title: buildRouteSummary(props.route) ?? undefined,
            tone: index === 0 ? "routePrimary" : "routeSecondary",
          }
        : null,
    )
    .filter((polyline): polyline is MapPolyline => polyline !== null);
  if (plannedPolylines.length > 0) {
    return plannedPolylines;
  }

  if (planningStatus.value === "loading" && planningUrl.value) {
    return [];
  }

  return projection.value.polylines.map((polyline) => ({
    ...polyline,
    tone: "routeInvalid",
  }));
});

const hasGeometry = computed(
  () => markers.value.length > 0 || polylines.value.length > 0,
);

const clearPlanning = () => {
  planningAbortController.value?.abort();
  planningAbortController.value = null;
  plannedRoutes.value = [];
};

watch(
  planningUrl,
  (url) => {
    clearPlanning();
    if (!url) {
      planningStatus.value = "idle";
      return;
    }

    const controller = new AbortController();
    planningAbortController.value = controller;
    planningStatus.value = "loading";

    void fetchTencentDrivingRoutePlans({
      url,
      signal: controller.signal,
    })
      .then((plans) => {
        if (controller.signal.aborted) {
          return;
        }
        plannedRoutes.value = plans;
        planningStatus.value = plans.length > 0 ? "success" : "error";
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        plannedRoutes.value = [];
        planningStatus.value = "error";
        console.warn("Tencent route planning failed.", error);
      });
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  clearPlanning();
});

const formatPointLabel = (point: RoutePoint, index: number): string => {
  const name = point.name.trim();
  const fallback = t("route.pointFallback", {
    index: index + 1,
  });
  const address = point.full_address?.trim() ?? "";
  return address.length > 0
    ? `${name || fallback} · ${address}`
    : name || fallback;
};
</script>

<style scoped lang="scss">
.route-map {
  min-width: 0;
}

.route-map--immersive {
  min-height: 320px;
}

.route-map__fallback {
  display: flex;
  min-height: 180px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sys-spacing-small);
  padding: var(--sys-spacing-medium);
  color: var(--sys-color-on-surface-variant);
  text-align: center;
}

.route-map__fallback--static {
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-low);
}

.route-map__fallback-icon {
  @include mx.pu-icon(large);
}

.route-map__fallback p {
  @include mx.pu-font(label-medium);
  margin: 0;
}

.route-map__points {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: calc(var(--sys-spacing-xsmall) / 2);
  margin: 0;
  padding-left: var(--sys-spacing-large);
  text-align: left;
}

.route-map__points li {
  @include mx.pu-font(body-small);
  overflow-wrap: anywhere;
}
</style>
