import { computed } from "vue";
import {
  type AdminLoginInput,
  type AdminLoginOptions,
  useAdminLogin,
} from "@/domains/admin/queries/useAdminLogin";
import { useAdminSessionStore } from "./useAdminSessionStore";

export const useAdminSessionLogin = (options: AdminLoginOptions = {}) => {
  const loginMutation = useAdminLogin(options);
  const adminSessionStore = useAdminSessionStore();

  const login = async (input: AdminLoginInput) => {
    const payload = await loginMutation.mutateAsync(input);
    adminSessionStore.applyAuthSession({
      role: payload.role,
      roles: payload.roles,
      userId: payload.userId,
      accessToken: payload.accessToken,
    });
    return payload;
  };

  return {
    login,
    isPending: loginMutation.isPending,
    errorMessage: computed(() => loginMutation.error.value?.message ?? null),
  };
};
