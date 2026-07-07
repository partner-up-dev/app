<template>
  <PuPageScaffold class="admin-page-scaffold">
    <div class="admin-page-scaffold__layout">
      <aside
        v-if="$slots.navigation || $slots.rail"
        class="admin-page-scaffold__aside"
      >
        <slot name="navigation" />

        <div v-if="$slots.rail" class="admin-page-scaffold__context">
          <slot name="rail" />
        </div>
      </aside>

      <div class="admin-page-scaffold__workspace">
        <header v-if="$slots.header" class="admin-page-scaffold__header">
          <slot name="header" />
        </header>

        <div v-if="$slots.actions" class="admin-page-scaffold__actions">
          <slot name="actions" />
        </div>

        <main class="admin-page-scaffold__body">
          <slot name="main">
            <slot />
          </slot>
        </main>
      </div>
    </div>
  </PuPageScaffold>
</template>

<script setup lang="ts">
import { PuPageScaffold } from "@partner-up-dev/design-web";
</script>

<style lang="scss" scoped>
.admin-page-scaffold {
  --pu-page-max-width: 1540px;
}

.admin-page-scaffold__layout,
.admin-page-scaffold__workspace,
.admin-page-scaffold__aside,
.admin-page-scaffold__context,
.admin-page-scaffold__body {
  min-width: 0;
}

.admin-page-scaffold__layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: var(--sys-spacing-xlarge);
  align-items: start;
}

.admin-page-scaffold__aside {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  max-height: calc(
    var(--pu-vh) - var(--pu-safe-top) - var(--pu-safe-bottom) -
      (var(--sys-spacing-medium) * 2)
  );
  overflow-y: auto;
}

.admin-page-scaffold__context {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.admin-page-scaffold__workspace {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-large);
}

.admin-page-scaffold__header {
  min-width: 0;
}

.admin-page-scaffold__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--sys-spacing-small);
  min-width: 0;
  flex-wrap: wrap;
}

@media (min-width: 901px) {
  .admin-page-scaffold__aside {
    position: sticky;
    top: calc(var(--sys-spacing-medium) + var(--pu-safe-top));
  }
}

@media (max-width: 900px) {
  .admin-page-scaffold__layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .admin-page-scaffold__aside {
    max-height: none;
    overflow-y: visible;
  }
}
</style>
