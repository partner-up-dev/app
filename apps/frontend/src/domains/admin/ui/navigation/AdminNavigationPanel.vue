<template>
  <section
    class="admin-navigation-panel"
    :class="{ 'is-collapsed': isPanelCollapsed }"
  >
    <div class="admin-navigation-panel__header">
      <div class="admin-navigation-panel__heading">
        <h1 class="admin-navigation-panel__title">
          {{ activeNavigationTitle }}
        </h1>
        <p v-if="!isPanelCollapsed" class="admin-navigation-panel__subtitle">
          {{ activeNavigationSubtitle }}
        </p>
      </div>

      <button
        class="admin-navigation-panel__panel-toggle"
        type="button"
        :aria-expanded="!isPanelCollapsed"
        aria-controls="admin-navigation-panel-body"
        :aria-label="panelToggleLabel"
        :title="panelToggleLabel"
        @click="togglePanel"
      >
        <span
          class="admin-navigation-panel__panel-toggle-icon"
          :class="isPanelCollapsed ? 'i-mdi-chevron-down' : 'i-mdi-chevron-up'"
          aria-hidden="true"
        ></span>
      </button>
    </div>

    <nav
      v-show="!isPanelCollapsed"
      id="admin-navigation-panel-body"
      class="admin-navigation-panel__nav"
      :aria-label="t('adminCommon.title')"
    >
      <section
        v-for="group in visibleNavigationGroups"
        :key="group.id"
        class="admin-navigation-panel__group"
        :class="{ 'is-active': activeGroupId === group.id }"
      >
        <button
          class="admin-navigation-panel__group-trigger"
          type="button"
          :aria-expanded="isGroupExpanded(group.id)"
          :aria-controls="`admin-navigation-panel-group-${group.id}`"
          @click="toggleGroup(group.id)"
        >
          <span>{{ t(group.labelKey) }}</span>
          <span
            class="admin-navigation-panel__chevron"
            aria-hidden="true"
          ></span>
        </button>

        <div
          v-if="isGroupExpanded(group.id)"
          :id="`admin-navigation-panel-group-${group.id}`"
          class="admin-navigation-panel__items"
        >
          <PuCard
            v-for="item in group.items"
            :key="item.id"
            :action="{ to: buildItemTarget(item) }"
            :active="isItemActive(item)"
            class="admin-navigation-panel__item"
            variant="soft"
            padding="sm"
            gap="xs"
          >
            <span class="admin-navigation-panel__item-label">
              {{ t(item.labelKey) }}
            </span>
          </PuCard>
        </div>
      </section>
    </nav>

    <PuButton
      v-if="showLogout"
      v-show="!isPanelCollapsed"
      shape="pill"
      tone="neutral" variant="outline"
      size="sm"

      @click="$emit('logout')"
    >
      {{ t("adminCommon.logoutAction") }}
    </PuButton>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useRoute, type RouteLocationRaw } from "vue-router";
import {
  adminNavigationGroups,
  type AdminNavigationItem,
} from "@/domains/admin/ui/navigation/adminNavigationModel";
import { useAdminSessionStore } from "@/domains/admin/use-cases/useAdminSessionStore";
import type { AdminSessionRole } from "@/domains/admin/model/admin-session-storage";
import { PuButton, PuCard } from "@partner-up-dev/design-web";

defineProps<{
  showLogout?: boolean;
}>();

defineEmits<{
  logout: [];
}>();

const { t } = useI18n();
const route = useRoute();
const adminSessionStore = useAdminSessionStore();
const { roles } = storeToRefs(adminSessionStore);
const expandedGroupIds = ref<Set<string>>(new Set());
const isPanelCollapsed = ref(false);
const hasRequiredRole = (
  requiredRoles: readonly AdminSessionRole[] | undefined,
): boolean =>
  !requiredRoles?.length ||
  roles.value.some((role) => requiredRoles.includes(role));

const visibleNavigationGroups = computed(() =>
  adminNavigationGroups
    .filter((group) => hasRequiredRole(group.requiredRoles))
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        hasRequiredRole(item.requiredRoles ?? group.requiredRoles),
      ),
    }))
    .filter((group) => group.items.length > 0),
);

const activeGroupId = computed(() => {
  const currentRouteName = typeof route.name === "string" ? route.name : "";
  return (
    visibleNavigationGroups.value.find((group) =>
      group.items.some((item) => item.routeName === currentRouteName),
    )?.id ?? null
  );
});

const activeNavigationItem = computed<AdminNavigationItem | null>(() => {
  for (const group of visibleNavigationGroups.value) {
    const item = group.items.find((candidate) => isItemActive(candidate));
    if (item) return item;
  }
  return null;
});

const activeNavigationTitle = computed(() =>
  t(activeNavigationItem.value?.labelKey ?? "adminCommon.title"),
);

const activeNavigationSubtitle = computed(() =>
  t(activeNavigationItem.value?.subtitleKey ?? "adminCommon.subtitle"),
);

const defaultSectionByRouteName = computed(() => {
  const defaults = new Map<string, string>();
  for (const group of visibleNavigationGroups.value) {
    for (const item of group.items) {
      if (!item.hash || defaults.has(item.routeName)) continue;
      defaults.set(item.routeName, item.hash);
    }
  }
  return defaults;
});

const buildItemTarget = (item: AdminNavigationItem): RouteLocationRaw => ({
  name: item.routeName,
  hash: item.hash,
});

const isGroupExpanded = (groupId: string): boolean =>
  expandedGroupIds.value.has(groupId);

const panelToggleLabel = computed(() =>
  isPanelCollapsed.value
    ? t("adminCommon.expandNavigationAction")
    : t("adminCommon.collapseNavigationAction"),
);

const togglePanel = (): void => {
  isPanelCollapsed.value = !isPanelCollapsed.value;
};

const toggleGroup = (groupId: string): void => {
  expandedGroupIds.value = expandedGroupIds.value.has(groupId)
    ? new Set()
    : new Set([groupId]);
};

const isItemActive = (item: AdminNavigationItem): boolean => {
  if (route.name !== item.routeName) return false;
  if (!item.hash) return route.hash.length === 0;
  return (
    route.hash === item.hash ||
    (route.hash.length === 0 &&
      defaultSectionByRouteName.value.get(item.routeName) === item.hash)
  );
};

watch(
  activeGroupId,
  (nextGroupId) => {
    if (!nextGroupId) return;
    expandedGroupIds.value = new Set([nextGroupId]);
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.admin-navigation-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  padding: var(--sys-spacing-medium);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-large);
  background: var(--sys-color-surface-container);
}

.admin-navigation-panel.is-collapsed {
  gap: 0;
}

.admin-navigation-panel__header,
.admin-navigation-panel__heading,
.admin-navigation-panel__nav,
.admin-navigation-panel__group,
.admin-navigation-panel__items {
  display: flex;
  flex-direction: column;
}

.admin-navigation-panel__header {
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
}

.admin-navigation-panel__heading {
  gap: var(--sys-spacing-xsmall);
  min-width: 0;
}

.admin-navigation-panel__nav {
  gap: var(--sys-spacing-medium);
}

.admin-navigation-panel__group {
  gap: var(--sys-spacing-small);
}

.admin-navigation-panel__items {
  gap: var(--sys-spacing-xsmall);
}

.admin-navigation-panel__title,
.admin-navigation-panel__subtitle,
.admin-navigation-panel__group-title {
  margin: 0;
}

.admin-navigation-panel__title {
  @include mx.pu-font(section);
  color: var(--sys-color-on-surface);
}

.admin-navigation-panel__subtitle {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

.admin-navigation-panel__group-trigger {
  @include mx.pu-font(control);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  width: 100%;
  min-width: 0;
  padding: var(--sys-spacing-xsmall) 0;
  border: 0;
  background: transparent;
  color: var(--sys-color-on-surface-variant);
  text-align: left;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.admin-navigation-panel__panel-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface-variant);
  cursor: pointer;

  &:hover {
    color: var(--sys-color-primary);
    border-color: var(--sys-color-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.admin-navigation-panel__panel-toggle-icon {
  @include mx.pu-icon(small);
  display: block;
}

.admin-navigation-panel__group.is-active
  .admin-navigation-panel__group-trigger {
  color: var(--sys-color-primary);
}

.admin-navigation-panel__chevron {
  width: var(--sys-spacing-small);
  height: var(--sys-spacing-small);
  flex-shrink: 0;
  border-right: 1px solid currentColor;
  border-bottom: 1px solid currentColor;
  transform: rotate(45deg);
  transition: transform 180ms ease;
}

.admin-navigation-panel__group
  .admin-navigation-panel__group-trigger[aria-expanded="true"]
  .admin-navigation-panel__chevron {
  transform: rotate(225deg);
}

.admin-navigation-panel__item {
  @include mx.pu-font(body);
}

.admin-navigation-panel__item.router-link-active:not(.is-active),
.admin-navigation-panel__item.router-link-exact-active:not(.is-active) {
  border-color: var(--sys-color-outline-variant);
}

.admin-navigation-panel__item.is-active,
.admin-navigation-panel__item.router-link-active.is-active,
.admin-navigation-panel__item.router-link-exact-active.is-active {
  border-color: var(--sys-color-primary);
}

.admin-navigation-panel__item-label {
  min-width: 0;
}

@media (prefers-reduced-motion: reduce) {
  .admin-navigation-panel__chevron {
    transition: none !important;
  }
}
</style>
