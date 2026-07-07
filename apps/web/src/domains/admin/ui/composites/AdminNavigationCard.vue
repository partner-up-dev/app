<template>
  <AdminNavigationPanel :show-logout="showLogout" @logout="$emit('logout')" />
</template>

<script setup lang="ts">
import AdminNavigationPanel from "@/domains/admin/ui/navigation/AdminNavigationPanel.vue";

defineProps<{
  showLogout?: boolean;
}>();

defineEmits<{
  logout: [];
}>();
</script>
