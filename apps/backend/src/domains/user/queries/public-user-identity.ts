import type { UserId, UserRole, UserStatus } from "../../../entities/user";

export type PublicUserRole = "anonymous" | "authenticated";

export type CurrentPublicUserIdentity = {
  userId: UserId;
  role: PublicUserRole;
};

type PersistedUserState = {
  id: UserId;
  status: UserStatus;
  role: readonly UserRole[];
};

/**
 * Classifies persisted user state for the public session boundary.
 * Operator roles are intentionally exclusive: a user retaining service or
 * analytics access is not admitted to the public browser context.
 */
export const classifyCurrentPublicUser = (
  user: PersistedUserState | null,
): CurrentPublicUserIdentity | null => {
  if (!user || user.status !== "ACTIVE") {
    return null;
  }

  if (user.role.includes("service") || user.role.includes("analytics")) {
    return null;
  }

  if (user.role.includes("authenticated")) {
    return { userId: user.id, role: "authenticated" };
  }

  if (user.role.includes("anonymous")) {
    return { userId: user.id, role: "anonymous" };
  }

  return null;
};
