<template>
  <Button
    v-if="props.qrEntry"
    v-bind="attrs"
    type="button"
    appearance="pill"
    :tone="props.tone"
    @click="$emit('openQr')"
  >
    <slot />
  </Button>
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
import Button from "@/shared/ui/actions/Button.vue";
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
