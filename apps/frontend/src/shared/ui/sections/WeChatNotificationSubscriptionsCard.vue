<template>
  <SurfaceCard gap="md">
    <h2 class="section-title">{{ title }}</h2>
    <slot />
  </SurfaceCard>
</template>

<script setup lang="ts">
import SurfaceCard from "@/shared/ui/containers/SurfaceCard.vue";

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
