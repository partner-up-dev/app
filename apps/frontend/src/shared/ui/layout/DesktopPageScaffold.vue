<template>
  <PuPageScaffold
    layout="aside"
    width="wide"
    sticky-aside
  >
    <template
      v-if="$slots.header"
      #header
    >
      <slot name="header" />
    </template>

    <template
      v-if="$slots.aside"
      #aside
    >
      <slot name="aside" />
    </template>

    <slot />
  </PuPageScaffold>
</template>

<script setup lang="ts">
import { PuPageScaffold } from "@partner-up-dev/design-web";
</script>
