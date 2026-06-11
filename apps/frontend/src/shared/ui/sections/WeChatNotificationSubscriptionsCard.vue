<template>
  <PuCard as="section" gap="md">
    <h2 class="section-title">{{ title }}</h2>
    <slot />
  </PuCard>
</template>

<script setup lang="ts">
import { PuCard } from "@partner-up-dev/design-web";

defineProps<{
  title: string;
}>();
</script>

<style scoped lang="scss">
.section-title {
  margin: 0;
  @include mx.pu-font(section);
}
</style>
