<template>
  <PuButton
    v-if="props.qrEntry"
    v-bind="attrs"
    shape="pill"
    :tone="props.tone"
    variant="solid"
    @click="$emit('openQr')"
  >
    <slot />
  </PuButton>
  <PuButton
    v-else
    v-bind="attrs"
    :action="{ href: props.href, external: true }"
    shape="pill"
    :tone="props.tone"
    variant="solid"
  >
    <slot />
  </PuButton>
</template>

<script setup lang="ts">
import { useAttrs } from "vue";
import { PuButton } from "@partner-up-dev/design-web";

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    href: string;
    qrEntry?: boolean;
    tone?: "primary" | "secondary";
  }>(),
  {
    qrEntry: false,
    tone: "primary",
  },
);

defineEmits<{
  openQr: [];
}>();

const attrs = useAttrs();
</script>
