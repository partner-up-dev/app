<template>
  <PuPageScaffold
    footer-placement="reveal"
    :content-placement="props.contentPlacement"
  >
    <template
      v-if="$slots.header"
      #header
    >
      <slot name="header" />
    </template>

    <slot />

    <template
      v-if="$slots.footer"
      #footer
    >
      <slot name="footer" />
    </template>
  </PuPageScaffold>
</template>

<script setup lang="ts">
import { PuPageScaffold } from "@partner-up-dev/design-web";

const props = withDefaults(
  defineProps<{
    contentPlacement?: "start" | "center";
  }>(),
  {
    contentPlacement: "start",
  },
);
</script>
