<template>
  <div class="anchor-event-route-pool-editor">
    <p class="hint">{{ t("adminPR.eventRoutePoolHint") }}</p>

    <Button
      type="button"
      appearance="pill"
      size="sm"
      @click="addRouteEntry"
    >
      {{ t("adminPR.eventRoutePoolAddAction") }}
    </Button>

    <p v-if="form.routePool.length === 0" class="hint">
      {{ t("adminPR.eventRoutePoolEmpty") }}
    </p>

    <article
      v-for="(entry, index) in form.routePool"
      :key="entry.id"
      class="route-pool-entry"
      data-testid="admin-anchor-event.route-pool.entry"
    >
      <div class="route-pool-entry__header">
        <label class="field route-pool-entry__id-field">
          <span class="field-label">{{ t("adminPR.eventRoutePoolIdLabel") }}</span>
          <input
            class="field-input"
            :value="entry.id"
            data-testid="admin-anchor-event.route-pool.entry-id"
            @input="updateRouteEntryId(index, $event)"
          />
        </label>

        <Button
          type="button"
          appearance="pill"
          tone="danger"
          size="sm"
          data-testid="admin-anchor-event.route-pool.remove"
          @click="removeRouteEntry(index)"
        >
          {{ t("adminPR.eventRoutePoolRemoveAction") }}
        </Button>
      </div>

      <p class="route-pool-entry__summary">
        {{ buildRouteSummary(entry.route) ?? t("adminPR.eventRoutePoolSummaryFallback") }}
      </p>

      <RouteEditor
        :model-value="entry.route"
        variant="inline"
        @update:model-value="updateRouteEntryRoute(index, $event)"
      />
    </article>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { AnchorEventRoutePool } from "@partner-up-dev/backend";
import Button from "@/shared/ui/actions/Button.vue";
import type { AnchorEventEditorForm } from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";
import {
  buildRouteSummary,
  cloneRoute,
  createEmptyRouteDraft,
  type Route,
} from "@/domains/route/model/route";
import RouteEditor from "@/domains/route/ui/RouteEditor.vue";

const form = defineModel<AnchorEventEditorForm>({ required: true });
const { t } = useI18n();

const cloneRoutePool = (): AnchorEventRoutePool =>
  form.value.routePool.map((entry) => ({
    id: entry.id,
    route: cloneRoute(entry.route) ?? createEmptyRouteDraft(),
  }));

const createRouteEntryId = (): string => {
  const usedIds = new Set(form.value.routePool.map((entry) => entry.id));
  let index = form.value.routePool.length + 1;
  let id = `route-${index}`;
  while (usedIds.has(id)) {
    index += 1;
    id = `route-${index}`;
  }
  return id;
};

const updateRoutePool = (routePool: AnchorEventRoutePool): void => {
  form.value = {
    ...form.value,
    routePool,
  };
};

const addRouteEntry = (): void => {
  updateRoutePool([
    ...cloneRoutePool(),
    {
      id: createRouteEntryId(),
      route: createEmptyRouteDraft(),
    },
  ]);
};

const removeRouteEntry = (index: number): void => {
  updateRoutePool(cloneRoutePool().filter((_, entryIndex) => entryIndex !== index));
};

const updateRouteEntryId = (index: number, event: Event): void => {
  const target = event.target as HTMLInputElement | null;
  const routePool = cloneRoutePool();
  const entry = routePool[index];
  if (!entry) {
    return;
  }
  entry.id = target?.value ?? "";
  updateRoutePool(routePool);
};

const updateRouteEntryRoute = (index: number, route: Route): void => {
  const routePool = cloneRoutePool();
  const entry = routePool[index];
  if (!entry) {
    return;
  }
  entry.route = cloneRoute(route) ?? createEmptyRouteDraft();
  updateRoutePool(routePool);
};
</script>

<style scoped lang="scss">
.anchor-event-route-pool-editor,
.route-pool-entry,
.field {
  display: flex;
  flex-direction: column;
}

.anchor-event-route-pool-editor {
  gap: var(--sys-spacing-small);
}

.route-pool-entry {
  gap: var(--sys-spacing-small);
  padding-block: var(--sys-spacing-small);
  border-top: 1px solid var(--sys-color-outline-variant);
}

.route-pool-entry__header {
  display: flex;
  align-items: flex-start;
  gap: var(--sys-spacing-small);
}

.route-pool-entry__id-field {
  flex: 1 1 auto;
}

.route-pool-entry__summary,
.hint {
  margin: 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.field {
  gap: var(--sys-spacing-xsmall);
}

.field-label {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-on-surface-variant);
}

.field-input {
  width: 100%;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}
</style>
