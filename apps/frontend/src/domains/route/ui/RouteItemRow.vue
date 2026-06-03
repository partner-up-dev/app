<template>
  <article
    v-if="variant === 'inline'"
    class="route-item-wrapper"
    :data-role="role"
  >
    <div class="route-item">
      <button
        class="route-item__location"
        type="button"
        :data-testid="`route.point.${index}.pick`"
        @click="emit('pick')"
      >
        {{ locationText }}
      </button>

      <button
        v-if="!disableDatetime"
        class="route-item__icon-action"
        type="button"
        :aria-label="t('route.editDatetime')"
        :data-testid="`route.point.${index}.datetime`"
        @click.stop="emit('editDatetime')"
      >
        <span class="i-mdi-clock" aria-hidden="true"></span>
      </button>
    </div>

    <button
      v-if="removable"
      class="route-item-wrapper__remove"
      type="button"
      :aria-label="t('route.removeWaypoint')"
      :data-testid="`route.point.${index}.remove`"
      @click="emit('remove')"
    >
      <span class="i-mdi-minus-circle" aria-hidden="true"></span>
    </button>

    <div
      v-if="canMoveUp || canMoveDown"
      class="route-item-wrapper__order-actions"
    >
      <button
        v-if="canMoveUp"
        class="route-item-wrapper__order-action"
        type="button"
        :aria-label="t('route.movePointUp')"
        :data-testid="`route.point.${index}.move-up`"
        @click="emit('moveUp')"
      >
        <span class="i-mdi-arrow-up" aria-hidden="true"></span>
      </button>
      <button
        v-if="canMoveDown"
        class="route-item-wrapper__order-action"
        type="button"
        :aria-label="t('route.movePointDown')"
        :data-testid="`route.point.${index}.move-down`"
        @click="emit('moveDown')"
      >
        <span class="i-mdi-arrow-down" aria-hidden="true"></span>
      </button>
    </div>
  </article>

  <article
    v-else
    class="route-item route-item--immersive"
    :class="`route-item--${role}`"
    :data-role="role"
  >
    <div class="route-item__title">{{ immersiveTitle }}</div>
    <div class="route-item__content">
      <button
        class="route-item__location"
        type="button"
        :data-testid="`route.point.${index}.pick`"
        @click="emit('pick')"
      >
        {{ locationText }}
      </button>

      <span v-if="role === 'departure'" class="route-item__text">
        {{ t("route.immersive.departure.text") }}
      </span>

      <button
        v-if="role === 'departure' && !disableDatetime"
        class="route-item__action"
        type="button"
        :aria-label="t('route.editDatetime')"
        :data-testid="`route.point.${index}.datetime`"
        @click="emit('editDatetime')"
      >
        <span class="i-mdi-clock" aria-hidden="true"></span>
      </button>

      <button
        v-if="role === 'waypoint' && removable"
        class="route-item__action"
        type="button"
        :aria-label="t('route.removeWaypoint')"
        :data-testid="`route.point.${index}.remove`"
        @click="emit('remove')"
      >
        <span class="i-mdi-minus-circle" aria-hidden="true"></span>
      </button>

      <div v-if="canMoveUp || canMoveDown" class="route-item__order-actions">
        <button
          v-if="canMoveUp"
          class="route-item__action"
          type="button"
          :aria-label="t('route.movePointUp')"
          :data-testid="`route.point.${index}.move-up`"
          @click="emit('moveUp')"
        >
          <span class="i-mdi-arrow-up" aria-hidden="true"></span>
        </button>
        <button
          v-if="canMoveDown"
          class="route-item__action"
          type="button"
          :aria-label="t('route.movePointDown')"
          :data-testid="`route.point.${index}.move-down`"
          @click="emit('moveDown')"
        >
          <span class="i-mdi-arrow-down" aria-hidden="true"></span>
        </button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { RoutePoint, RoutePointRole } from "@/domains/route/model/route";
import { resolveRoutePointRole } from "@/domains/route/model/route";

const props = withDefaults(
  defineProps<{
    modelValue: RoutePoint;
    index: number;
    total: number;
    removable?: boolean;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
    variant?: "inline" | "immersive";
    disableDatetime?: boolean;
  }>(),
  {
    removable: false,
    canMoveUp: false,
    canMoveDown: false,
    variant: "inline",
    disableDatetime: true,
  },
);

const emit = defineEmits<{
  pick: [];
  remove: [];
  moveUp: [];
  moveDown: [];
  editDatetime: [];
}>();

const { t } = useI18n();

const role = computed<RoutePointRole>(() =>
  resolveRoutePointRole(props.index, props.total),
);

const locationText = computed(() => {
  const name = props.modelValue.name.trim();
  if (name.length > 0) {
    return name;
  }

  return t(`route.placeholder.${role.value}`);
});

const immersiveTitle = computed(() =>
  t(`route.immersive.${role.value}.title`),
);
</script>

<style scoped lang="scss">
.route-item-wrapper {
  display: flex;
  align-items: center;
  min-width: 0;
  padding-right: var(--sys-spacing-small);
  box-sizing: border-box;
}

.route-item {
  min-width: 0;
}

.route-item-wrapper > .route-item {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  min-height: var(--sys-size-large);
  box-sizing: border-box;
  padding: var(--sys-spacing-xsmall) var(--sys-spacing-small);
  background: var(--sys-color-surface-container);
}

.route-item__location {
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--sys-color-on-surface);
  cursor: pointer;
  appearance: none;
}

.route-item-wrapper > .route-item .route-item__location {
  @include mx.pu-font(label-large);
  flex: 1 1 auto;
  padding: 0;
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.route-item__icon-action,
.route-item-wrapper__remove,
.route-item-wrapper__order-action,
.route-item__action {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 0;
  background: transparent;
  cursor: pointer;
  appearance: none;
}

.route-item__icon-action,
.route-item-wrapper__remove,
.route-item-wrapper__order-action {
  width: var(--sys-size-medium);
  height: var(--sys-size-medium);
  color: var(--sys-color-on-surface-variant);
}

.route-item-wrapper__remove {
  color: var(--sys-color-tertiary);
}

.route-item__icon-action span,
.route-item-wrapper__remove span,
.route-item-wrapper__order-action span,
.route-item__action span {
  @include mx.pu-icon(medium);
}

.route-item__location:focus-visible,
.route-item__icon-action:focus-visible,
.route-item-wrapper__remove:focus-visible,
.route-item-wrapper__order-action:focus-visible,
.route-item__action:focus-visible {
  outline: 2px solid var(--sys-color-primary);
  outline-offset: 2px;
}

.route-item-wrapper__order-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  align-self: stretch;
}

.route-item--immersive {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.route-item--immersive .route-item__title {
  @include mx.pu-font(headline-large);
  color: var(--sys-color-on-surface);
}

.route-item--immersive .route-item__content {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-xsmall);
  min-width: 0;
  @include mx.pu-font(title-large);
}

.route-item--immersive .route-item__location {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  min-width: 0;
  min-height: 32px;
  padding: 0;
  overflow-x: auto;
  color: var(--sys-color-secondary);
  text-align: left;
  white-space: nowrap;
}

.route-item__text,
.route-item__action,
.route-item__order-actions {
  flex: 0 0 auto;
}

.route-item__action {
  width: var(--sys-size-large);
  height: var(--sys-size-large);
  padding: 0;
  color: var(--sys-color-tertiary);
}

.route-item__order-actions {
  display: flex;
  align-items: center;
}
</style>
