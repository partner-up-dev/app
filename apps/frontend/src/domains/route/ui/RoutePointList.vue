<template>
  <ol class="route-point-list" :class="`route-point-list--${variant}`">
    <li
      v-for="(point, index) in points"
      :key="`${index}-${point.name}-${point.full_address ?? ''}`"
      class="route-point-list__item"
    >
      <span
        class="route-point-list__dot"
        :class="`route-point-list__dot--${resolveRole(index)}`"
        aria-hidden="true"
      ></span>
      <span class="route-point-list__body">
        <span class="route-point-list__name">
          {{ pointName(point, index) }}
        </span>
        <span v-if="showAddress && pointAddress(point)" class="route-point-list__address">
          {{ pointAddress(point) }}
        </span>
      </span>
    </li>
  </ol>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  resolveRoutePointRole,
  type Route,
  type RoutePoint,
  type RoutePointRole,
} from "@/domains/route/model/route";

const props = withDefaults(
  defineProps<{
    route: Route | null;
    showAddress?: boolean;
    variant?: "compact" | "detail";
  }>(),
  {
    showAddress: false,
    variant: "compact",
  },
);

const { t } = useI18n();

const points = computed(() => props.route ?? []);

const resolveRole = (index: number): RoutePointRole =>
  resolveRoutePointRole(index, points.value.length);

const pointName = (point: RoutePoint, index: number): string => {
  const name = point.name.trim();
  if (name.length > 0) {
    return name;
  }

  return t("route.pointFallback", {
    index: index + 1,
  });
};

const pointAddress = (point: RoutePoint): string | null => {
  const address = point.full_address?.trim() ?? "";
  return address.length > 0 ? address : null;
};
</script>

<style scoped lang="scss">
.route-point-list {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
  margin: 0;
  padding: 0;
  list-style: none;
}

.route-point-list__item {
  display: grid;
  min-width: 0;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: var(--sys-spacing-small);
}

.route-point-list__dot {
  width: 0.5rem;
  height: 0.5rem;
  margin-top: 0.45em;
  border-radius: 999px;
}

.route-point-list__dot--departure {
  background: var(--sys-color-primary);
}

.route-point-list__dot--waypoint {
  background: var(--sys-color-tertiary);
}

.route-point-list__dot--arrival {
  background: var(--sys-color-error);
}

.route-point-list__body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: calc(var(--sys-spacing-xsmall) / 2);
}

.route-point-list__name {
  min-width: 0;
  color: var(--sys-color-on-surface);
  overflow-wrap: anywhere;
}

.route-point-list--compact .route-point-list__name {
  @include mx.pu-font(control);
}

.route-point-list--detail .route-point-list__name {
  @include mx.pu-font(body);
}

.route-point-list__address {
  @include mx.pu-font(support);
  min-width: 0;
  color: var(--sys-color-on-surface-variant);
  overflow-wrap: anywhere;
}
</style>
