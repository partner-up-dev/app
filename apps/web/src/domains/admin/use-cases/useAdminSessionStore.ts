import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  getStoredAdminAccessToken,
  getStoredAdminSessionRole,
  getStoredAdminSessionRoles,
  getStoredAdminUserId,
  resolvePrimaryAdminSessionRole,
  setStoredAdminAccessToken,
  setStoredAdminSessionRoles,
  setStoredAdminUserId,
  type AdminSessionRole,
} from "@/domains/admin/model/admin-session-storage";
import type { SessionRole } from "@/shared/auth/session-storage";

export type AdminAuthSessionPayload = {
  role: SessionRole;
  roles?: readonly SessionRole[];
  userId: string | null;
  accessToken: string;
};

const normalizeRole = (role: SessionRole): AdminSessionRole =>
  role === "service" || role === "analytics" ? role : "anonymous";

const normalizeRoles = (
  roles: readonly SessionRole[] | undefined,
  fallbackRole: SessionRole,
): AdminSessionRole[] => {
  const normalized = [...new Set(roles ?? [fallbackRole])].map(normalizeRole);
  if (normalized.includes("service") || normalized.includes("analytics")) {
    return normalized.filter((role) => role !== "anonymous");
  }

  return ["anonymous"];
};

export const useAdminSessionStore = defineStore("adminSession", () => {
  const role = ref<AdminSessionRole>(getStoredAdminSessionRole());
  const roles = ref<AdminSessionRole[]>(getStoredAdminSessionRoles());
  const userId = ref<string | null>(getStoredAdminUserId());
  const accessToken = ref<string | null>(getStoredAdminAccessToken());

  const hasAdminAccess = computed(
    () =>
      roles.value.includes("service") &&
      Boolean(userId.value) &&
      Boolean(accessToken.value),
  );
  const hasAnalyticsAccess = computed(
    () =>
      roles.value.includes("analytics") &&
      Boolean(userId.value) &&
      Boolean(accessToken.value),
  );

  const syncStorage = () => {
    setStoredAdminSessionRoles(roles.value);
    setStoredAdminUserId(userId.value);
    setStoredAdminAccessToken(accessToken.value);
  };

  const applyAuthSession = (payload: AdminAuthSessionPayload) => {
    const nextRoles = normalizeRoles(payload.roles, payload.role);
    const nextRole = resolvePrimaryAdminSessionRole(nextRoles);

    role.value = nextRole;
    roles.value = nextRoles;
    userId.value = nextRole === "anonymous" ? null : payload.userId;
    accessToken.value = payload.accessToken;
    syncStorage();
  };

  const clearSession = () => {
    role.value = "anonymous";
    roles.value = ["anonymous"];
    userId.value = null;
    accessToken.value = null;
    syncStorage();
  };

  const setAccessToken = (token: string | null) => {
    accessToken.value = token;
    setStoredAdminAccessToken(token);
  };

  return {
    role,
    roles,
    userId,
    accessToken,
    hasAdminAccess,
    hasAnalyticsAccess,
    applyAuthSession,
    clearSession,
    setAccessToken,
  };
});
