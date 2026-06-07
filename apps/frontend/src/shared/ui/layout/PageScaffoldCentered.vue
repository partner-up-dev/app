<template>
  <PuPageScaffold content-placement="center">
    <template
      v-if="$slots.header"
      #header
    >
      <slot name="header" />
    </template>

    <slot />

    <template
      v-if="$slots.actions || $slots.footer"
      #footer
    >
      <slot name="actions" />
      <slot name="footer" />
    </template>
  </PuPageScaffold>
</template>

<script setup lang="ts">
import { PuPageScaffold } from "@partner-up-dev/design-web";
</script>
