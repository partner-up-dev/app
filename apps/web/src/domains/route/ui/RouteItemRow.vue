<template>
  <article v-if="variant === 'inline'" class="route-item-row" :data-role="role">
    <div class="route-item-row__field">
      <button
        class="route-item-row__location"
        type="button"
        :data-testid="`route.point.${index}.pick`"
        @click="emit('pick')"
      >
        {{ locationText }}
      </button>

      <button
        v-if="!disableDatetime"
        class="route-item-row__icon-action"
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
      class="route-item-row__remove"
      type="button"
      :aria-label="t('route.removeWaypoint')"
      :data-testid="`route.point.${index}.remove`"
      @click="emit('remove')"
    >
      <span class="i-mdi-minus-circle" aria-hidden="true"></span>
    </button>

    <div v-if="canMoveUp || canMoveDown" class="route-item-row__order-actions">
      <button
        v-if="canMoveUp"
        class="route-item-row__order-action"
        type="button"
        :aria-label="t('route.movePointUp')"
        :data-testid="`route.point.${index}.move-up`"
        @click="emit('moveUp')"
      >
        <span class="i-mdi-arrow-up" aria-hidden="true"></span>
      </button>
      <button
        v-if="canMoveDown"
        class="route-item-row__order-action"
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
    class="route-item-row route-item-row--immersive"
    :class="`route-item-row--${role}`"
    :data-role="role"
  >
    <div class="route-item-row__title">{{ immersiveTitle }}</div>
    <div class="route-item-row__body">
      <button
        class="route-item-row__location"
        type="button"
        :data-testid="`route.point.${index}.pick`"
        @click="emit('pick')"
      >
        {{ locationText }}
      </button>

      <span v-if="role === 'departure'" class="route-item-row__text">
        {{ t("route.immersive.departure.text") }}
      </span>

      <button
        v-if="role === 'departure' && !disableDatetime"
        class="route-item-row__action"
        type="button"
        :aria-label="t('route.editDatetime')"
        :data-testid="`route.point.${index}.datetime`"
        @click="emit('editDatetime')"
      >
        <span class="i-mdi-clock" aria-hidden="true"></span>
      </button>

      <button
        v-if="role === 'waypoint' && removable"
        class="route-item-row__action"
        type="button"
        :aria-label="t('route.removeWaypoint')"
        :data-testid="`route.point.${index}.remove`"
        @click="emit('remove')"
      >
        <span class="i-mdi-minus-circle" aria-hidden="true"></span>
      </button>

      <div v-if="canMoveUp || canMoveDown" class="route-item-row__order-actions">
        <button
          v-if="canMoveUp"
          class="route-item-row__action"
          type="button"
          :aria-label="t('route.movePointUp')"
          :data-testid="`route.point.${index}.move-up`"
          @click="emit('moveUp')"
        >
          <span class="i-mdi-arrow-up" aria-hidden="true"></span>
        </button>
        <button
          v-if="canMoveDown"
          class="route-item-row__action"
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

const role = computed<RoutePointRole>(() => resolveRoutePointRole(props.index, props.total));

const locationText = computed(() => {
  const name = props.modelValue.name.trim();
  if (name.length > 0) {
    return name;
  }

  return t(`route.placeholder.${role.value}`);
});

const immersiveTitle = computed(() => t(`route.immersive.${role.value}.title`));
</script>

<style scoped lang="scss">
.route-item-row {
  display: flex;
  align-items: center;
  min-width: 0;
  padding-right: var(--sys-spacing-small);
  box-sizing: border-box;
}

.route-item-row__field {
  min-width: 0;
}

.route-item-row > .route-item-row__field {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  min-height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  box-sizing: border-box;
  padding: var(--sys-spacing-xsmall) var(--sys-spacing-small);
  background: var(--sys-color-surface-container);
}

.route-item-row__location {
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--sys-color-on-surface);
  cursor: pointer;
  appearance: none;
}

.route-item-row > .route-item-row__field .route-item-row__location {
  @include mx.pu-font(control);
  flex: 1 1 auto;
  padding: 0;
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.route-item-row__icon-action,
.route-item-row__remove,
.route-item-row__order-action,
.route-item-row__action {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 0;
  background: transparent;
  cursor: pointer;
  appearance: none;
}

.route-item-row__icon-action,
.route-item-row__remove,
.route-item-row__order-action {
  width: var(--sys-spacing-large);
  height: var(--sys-spacing-large);
  color: var(--sys-color-on-surface-variant);
}

.route-item-row__remove {
  color: var(--sys-color-tertiary);
}

.route-item-row__icon-action span,
.route-item-row__remove span,
.route-item-row__order-action span,
.route-item-row__action span {
  @include mx.pu-icon(medium);
}

.route-item-row__location:focus-visible,
.route-item-row__icon-action:focus-visible,
.route-item-row__remove:focus-visible,
.route-item-row__order-action:focus-visible,
.route-item-row__action:focus-visible {
  outline: 2px solid var(--sys-color-primary);
  outline-offset: 2px;
}

.route-item-row__order-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  align-self: stretch;
}

.route-item-row--immersive {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.route-item-row--immersive .route-item-row__title {
  @include mx.pu-font(hero);
  color: var(--sys-color-on-surface);
}

.route-item-row--immersive .route-item-row__body {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-xsmall);
  min-width: 0;
  @include mx.pu-font(title);
}

.route-item-row--immersive .route-item-row__location {
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

.route-item-row__text,
.route-item-row__action,
.route-item-row__order-actions {
  flex: 0 0 auto;
}

.route-item-row__action {
  width: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  padding: 0;
  color: var(--sys-color-tertiary);
}

.route-item-row__order-actions {
  display: flex;
  align-items: center;
}
</style>
