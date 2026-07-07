<template>
  <div class="bento-layout">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.bento-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-medium);
  align-items: start;
}

@media (max-width: 720px) {
  .bento-layout {
    grid-template-columns: 1fr;
  }
}
</style>
