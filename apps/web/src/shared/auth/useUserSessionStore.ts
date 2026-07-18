import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
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

type IncomingAuthSessionPayload = Omit<AuthSessionPayload, "role"> & {
  role: SessionRole | "service" | "analytics";
};

export const useUserSessionStore = defineStore("userSession", () => {
  const role = ref<SessionRole>(getStoredSessionRole());
  const userId = ref<string | null>(getStoredUserId());

  const isAuthenticated = computed(
    () => isAuthenticatedSessionRole(role.value) && Boolean(userId.value),
  );

  const syncStorage = () => {
    setStoredSessionRole(role.value);
    setStoredUserId(userId.value);
  };

  const applyAuthSession = (payload: IncomingAuthSessionPayload) => {
    // Operator roles belong to the separate admin context. Keep the legacy
    // callback/handoff payload assignable without projecting them publicly.
    if (payload.role === "service" || payload.role === "analytics") {
      clearSession();
      return;
    }

    const nextRole: SessionRole = payload.role === "authenticated" ? "authenticated" : "anonymous";
    role.value = nextRole;
    userId.value = payload.userId;
    setStoredAccessToken(payload.accessToken);
    syncStorage();
  };

  const clearSession = () => {
    role.value = "anonymous";
    userId.value = null;
    setStoredAccessToken(null);
    syncStorage();
  };

  return {
    role,
    userId,
    isAuthenticated,
    applyAuthSession,
    clearSession,
  };
});
