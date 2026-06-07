<template>
  <section class="route-editor" :class="editorClass" data-testid="route.editor">
    <template v-if="isNormalVariant">
      <div class="operations">
        <button
          type="button"
          class="route-editor__icon-action"
          :aria-label="t('route.showMapAction')"
          :disabled="!canOpenRouteMap"
          data-testid="route.open-map"
          @click="openRouteMap"
        >
          <span class="i-mdi-map" aria-hidden="true"></span>
        </button>
        <button
          type="button"
          class="route-editor__icon-action"
          :aria-label="t('route.addWaypoint')"
          :disabled="!canAddWaypoint"
          data-testid="route.add-waypoint"
          @click="addWaypoint"
        >
          <span class="i-mdi-plus" aria-hidden="true"></span>
        </button>
      </div>

      <div class="content">
        <RouteItemRow
          v-for="(point, index) in editableRoute"
          :key="`${editableRoute.length}-${index}`"
          :model-value="point"
          :index="index"
          :total="editableRoute.length"
          :removable="isWaypoint(index)"
          :can-move-up="index > 0"
          :can-move-down="index < editableRoute.length - 1"
          :disable-datetime="disableDatetime"
          variant="inline"
          @pick="openLocationPicker(index)"
          @remove="removePoint(index)"
          @move-up="movePoint(index, 'up')"
          @move-down="movePoint(index, 'down')"
          @edit-datetime="handleEditDatetime(index)"
        />
      </div>
    </template>

    <template v-else>
      <div class="form">
        <RouteItemRow
          :model-value="departurePoint"
          :index="0"
          :total="editableRoute.length"
          :can-move-down="editableRoute.length > 1"
          :disable-datetime="disableDatetime"
          variant="immersive"
          @pick="openLocationPicker(0)"
          @move-down="movePoint(0, 'down')"
          @edit-datetime="handleEditDatetime(0)"
        />

        <RouteItemRow
          v-for="(point, waypointIndex) in waypointItems"
          :key="`${editableRoute.length}-waypoint-${waypointIndex}`"
          :model-value="point"
          :index="waypointIndex + 1"
          :total="editableRoute.length"
          :disable-datetime="disableDatetime"
          can-move-up
          can-move-down
          removable
          variant="immersive"
          @pick="openLocationPicker(waypointIndex + 1)"
          @remove="removePoint(waypointIndex + 1)"
          @move-up="movePoint(waypointIndex + 1, 'up')"
          @move-down="movePoint(waypointIndex + 1, 'down')"
          @edit-datetime="handleEditDatetime(waypointIndex + 1)"
        />

        <RouteItemRow
          :model-value="arrivalPoint"
          :index="editableRoute.length - 1"
          :total="editableRoute.length"
          :can-move-up="editableRoute.length > 1"
          :disable-datetime="disableDatetime"
          variant="immersive"
          @pick="openLocationPicker(editableRoute.length - 1)"
          @move-up="movePoint(editableRoute.length - 1, 'up')"
          @edit-datetime="handleEditDatetime(editableRoute.length - 1)"
        />
      </div>

      <div class="operations">
        <Button
          tone="surface"
          :disabled="!canOpenRouteMap"
          @click="openRouteMap"
        >
          {{ t("route.navigateAction") }}
        </Button>
        <Button
          tone="tertiary"
          :disabled="!canAddWaypoint"
          @click="addWaypoint"
        >
          {{ t("route.addWaypoint") }}
        </Button>
      </div>
    </template>

    <Modal
      :open="routeMapOpen"
      :title="t('route.mapTitle')"
      max-width="760px"
      @close="closeRouteMap"
    >
      <RouteMap
        class="route-editor__map"
        :route="editableRoute"
        :variant="variant"
        :interactive="false"
        :fit-padding="32"
      />
    </Modal>

    <LocationPickerModal
      :open="pendingPickerIndex !== null"
      :title="pendingPickerTitle"
      :initial-location="pendingPickerLocation"
      @pick="handleLocationPicked"
      @close="closeLocationPicker"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import LocationPickerModal from "@/domains/location/ui/LocationPickerModal.vue";
import type { PickedLocation } from "@/domains/location/model/location-picker";
import RouteMap from "@/domains/route/ui/RouteMap.vue";
import RouteItemRow from "@/domains/route/ui/RouteItemRow.vue";
import type { Route, RoutePoint } from "@/domains/route/model/route";
import {
  applyPickedLocationToRoutePoint,
  cloneRoute,
  createEmptyRouteDraft,
  getRouteValidationIssue,
  insertRouteWaypoint,
  removeRoutePointAt,
  replaceRoutePointAt,
  resolveRoutePointRole,
  swapRoutePointWithNeighbor,
} from "@/domains/route/model/route";
import Button from "@/shared/ui/actions/Button.vue";
import Modal from "@/shared/ui/overlay/Modal.vue";

const props = withDefaults(
  defineProps<{
    modelValue: Route | null;
    variant?: "inline" | "immersive";
    max?: number;
    disableDatetime?: boolean;
    useDepDatetimeEditor?: boolean;
  }>(),
  {
    variant: "inline",
    max: 6,
    disableDatetime: true,
    useDepDatetimeEditor: true,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: Route];
  change: [];
  complete: [];
  editDatetime: [index: number];
  editDepTime: [];
}>();

const { t } = useI18n();
const routeMapOpen = ref(false);
const pendingPickerIndex = ref<number | null>(null);

const editableRoute = computed<Route>(
  () => cloneRoute(props.modelValue) ?? createEmptyRouteDraft(),
);

const isNormalVariant = computed(() => props.variant === "inline");
const editorClass = computed(() =>
  isNormalVariant.value ? "route-editor--normal" : "route-editor--immersive",
);

const departurePoint = computed<RoutePoint>(
  () => editableRoute.value[0] ?? createEmptyRouteDraft()[0],
);

const arrivalPoint = computed<RoutePoint>(
  () =>
    editableRoute.value[editableRoute.value.length - 1] ??
    createEmptyRouteDraft()[1],
);

const waypointItems = computed<RoutePoint[]>(() =>
  editableRoute.value.slice(1, -1),
);

const canAddWaypoint = computed(() => editableRoute.value.length < props.max);
const canOpenRouteMap = computed(
  () => getRouteValidationIssue(editableRoute.value) === null,
);

const pendingRoutePoint = computed<RoutePoint | null>(() => {
  const index = pendingPickerIndex.value;
  return index === null ? null : (editableRoute.value[index] ?? null);
});

const pendingPickerTitle = computed(() => {
  const index = pendingPickerIndex.value;
  if (index === null) {
    return t("locationPicker.title");
  }
  return t("route.pickPointTitle", {
    role: t(
      `route.pointRole.${resolveRoutePointRole(index, editableRoute.value.length)}`,
    ),
  });
});

const pendingPickerLocation = computed<PickedLocation | null>(() => {
  const point = pendingRoutePoint.value;
  if (!point?.gcj02) {
    return null;
  }

  return {
    name:
      point.name.trim() ||
      t("route.pointFallback", {
        index: (pendingPickerIndex.value ?? 0) + 1,
      }),
    address: point.full_address,
    cityName: null,
    gcj02: [point.gcj02[0], point.gcj02[1]],
  };
});

const isWaypoint = (index: number): boolean =>
  resolveRoutePointRole(index, editableRoute.value.length) === "waypoint";

const addWaypoint = () => {
  if (!canAddWaypoint.value) {
    return;
  }

  emitRouteChange(insertRouteWaypoint(editableRoute.value));
};

const openRouteMap = () => {
  if (!canOpenRouteMap.value) {
    return;
  }

  routeMapOpen.value = true;
};

const closeRouteMap = () => {
  routeMapOpen.value = false;
};

const openLocationPicker = (index: number) => {
  pendingPickerIndex.value = index;
};

const closeLocationPicker = () => {
  pendingPickerIndex.value = null;
};

const removePoint = (index: number) => {
  emitRouteChange(removeRoutePointAt(editableRoute.value, index));
};

const movePoint = (index: number, direction: "up" | "down") => {
  emitRouteChange(
    swapRoutePointWithNeighbor({
      route: editableRoute.value,
      index,
      direction,
    }),
  );
};

const handleEditDatetime = (index: number) => {
  if (props.disableDatetime) {
    return;
  }

  if (
    props.variant === "immersive" &&
    !props.useDepDatetimeEditor &&
    index === 0
  ) {
    emit("editDepTime");
    return;
  }

  emit("editDatetime", index);
};

const isRouteComplete = (route: Route): boolean =>
  getRouteValidationIssue(route) === null;

const emitRouteChange = (route: Route) => {
  emit("update:modelValue", route);
  emit("change");

  if (props.variant === "immersive" && isRouteComplete(route)) {
    window.setTimeout(() => {
      emit("complete");
    }, 500);
  }
};

const handleLocationPicked = (location: PickedLocation) => {
  const index = pendingPickerIndex.value;
  const point = pendingRoutePoint.value;
  if (index === null || !point) {
    return;
  }

  emitRouteChange(
    replaceRoutePointAt({
      route: editableRoute.value,
      index,
      point: applyPickedLocationToRoutePoint({
        point,
        location,
      }),
    }),
  );
  closeLocationPicker();
};
</script>

<style scoped lang="scss">
.route-editor {
  display: flex;
  min-width: 0;
}

.route-editor--normal {
  flex-direction: row;
  align-items: flex-start;
}

.route-editor--normal .content {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  align-self: stretch;
  gap: 0;
}

.route-editor--normal .operations {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  align-self: flex-start;
  gap: 0;
  padding: 0 var(--sys-spacing-xsmall);
}

.route-editor__icon-action {
  display: grid;
  width: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  place-items: center;
  border: 0;
  border-radius: var(--sys-radius-small);
  color: var(--sys-color-on-surface);
  background: transparent;
  cursor: pointer;
  appearance: none;
}

.route-editor__icon-action:disabled {
  opacity: var(--sys-opacity-disabled);
  cursor: not-allowed;
}

.route-editor__icon-action:focus-visible {
  outline: 2px solid var(--sys-color-primary);
  outline-offset: 2px;
}

.route-editor__icon-action span {
  @include mx.pu-icon(small);
}

.route-editor--immersive {
  flex-direction: column;
  gap: var(--sys-spacing-large);
}

.route-editor--immersive .form {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.route-editor--immersive .operations {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  gap: var(--sys-spacing-small);
}

.route-editor__map {
  width: 100%;
}

@media (max-width: 480px) {
  .route-editor--immersive .operations {
    flex-direction: column;
  }
}
</style>
