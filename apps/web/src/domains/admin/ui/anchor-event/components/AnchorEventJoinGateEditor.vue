<template>
  <PRJoinGateConfigEditor
    v-model="form.joinGateConfig"
    source="ANCHOR_EVENT"
  />
</template>

<script setup lang="ts">
import PRJoinGateConfigEditor from "@/domains/pr/ui/forms/PRJoinGateConfigEditor.vue";
import type { AnchorEventEditorForm } from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";

const form = defineModel<AnchorEventEditorForm>({ required: true });
</script>
