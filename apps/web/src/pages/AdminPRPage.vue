<template>
  <AdminPRBasicView v-if="activeAdminSection === 'pr-basic'" />
  <AdminPRMessagesView v-else />
</template>

<script setup lang="ts">
import AdminPRBasicView from "@/domains/admin/ui/pr/views/AdminPRBasicView.vue";
import AdminPRMessagesView from "@/domains/admin/ui/pr/views/AdminPRMessagesView.vue";
import { useAdminNavigationSection } from "@/domains/admin/use-cases/useAdminNavigationSection";

const activeAdminSection = useAdminNavigationSection("pr-basic", [
  "pr-basic",
  "pr-messages",
] as const);
</script>
