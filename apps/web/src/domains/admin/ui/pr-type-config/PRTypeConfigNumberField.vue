<template>
  <label class="field">
    <span class="field-label">{{ label }}</span>
    <input :value="textValue" class="field-input" type="number" :min="min" @input="onInput" />
  </label>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

const props = withDefaults(defineProps<{ label: string; value: number | null; min?: number }>(), {
  min: 0,
});
const emit = defineEmits<{ update: [value: string] }>();
const textValue = ref(props.value === null ? "" : String(props.value));
watch(
  () => props.value,
  (value) => {
    textValue.value = value === null ? "" : String(value);
  },
);
const onInput = (event: Event) => {
  textValue.value = (event.target as HTMLInputElement).value;
  emit("update", textValue.value);
};
</script>
