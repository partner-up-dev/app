import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useAdminSessionStore } from "@/domains/admin/use-cases/useAdminSessionStore";

export const useAdminAccess = () => {
  const router = useRouter();
  const adminSessionStore = useAdminSessionStore();
  const { hasAdminAccess, hasAnalyticsAccess } = storeToRefs(adminSessionStore);

  const logout = async () => {
    adminSessionStore.clearSession();
    await router.replace({ name: "admin-login" });
  };

  return {
    isAdmin: hasAdminAccess,
    isAnalytics: hasAnalyticsAccess,
    logout,
  };
};
