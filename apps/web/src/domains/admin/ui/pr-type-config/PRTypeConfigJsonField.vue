<template>
  <label class="field field--full">
    <span class="field-label">{{ label }}</span>
    <textarea
      :value="value"
      class="field-input field-textarea"
      spellcheck="false"
      @input="$emit('update', ($event.target as HTMLTextAreaElement).value)"
    />
    <span v-if="error" class="error-text">{{ error }}</span>
  </label>
</template>

<script setup lang="ts">
defineProps<{ label: string; value: string; error?: string }>();
defineEmits<{ update: [value: string] }>();
</script>
