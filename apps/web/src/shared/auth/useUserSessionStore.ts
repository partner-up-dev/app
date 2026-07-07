import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  getStoredAccessToken,
  getStoredSessionRole,
  getStoredUserId,
  isAuthenticatedSessionRole,
  setStoredAccessToken,
  setStoredSessionRole,
  setStoredUserId,
  type SessionRole,
} from "@/shared/auth/session-storage";

export type AuthSessionPayload = {
  role: SessionRole;
  userId: string | null;
  accessToken: string;
};

export const useUserSessionStore = defineStore("userSession", () => {
  const role = ref<SessionRole>(getStoredSessionRole());
  const userId = ref<string | null>(getStoredUserId());
  const accessToken = ref<string | null>(getStoredAccessToken());

  const isAuthenticated = computed(
    () => isAuthenticatedSessionRole(role.value) && Boolean(userId.value),
  );

  const hasAdminAccess = computed(
    () =>
      role.value === "service" &&
      Boolean(userId.value) &&
      Boolean(accessToken.value),
  );

  const syncStorage = () => {
    setStoredSessionRole(role.value);
    setStoredUserId(userId.value);
    setStoredAccessToken(accessToken.value);
  };

  const applyAuthSession = (payload: AuthSessionPayload) => {
    role.value = payload.role;
    userId.value = payload.userId;
    accessToken.value = payload.accessToken;
    syncStorage();
  };

  const setAccessToken = (token: string | null) => {
    accessToken.value = token;
    setStoredAccessToken(token);
  };

  const setRole = (nextRole: SessionRole) => {
    role.value = nextRole;
    setStoredSessionRole(nextRole);
  };

  const clearSession = () => {
    role.value = "anonymous";
    userId.value = null;
    accessToken.value = null;
    syncStorage();
  };

  return {
    role,
    userId,
    accessToken,
    isAuthenticated,
    hasAdminAccess,
    applyAuthSession,
    setAccessToken,
    setRole,
    clearSession,
  };
});
