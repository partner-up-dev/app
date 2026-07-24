import { hasAnyUserRole, type UserId } from "../../../entities/user";
import { UserRepository } from "../../../repositories/UserRepository";
import type { OperatorAuthRole, OperatorCredentialIdentity } from "../contracts";
import { verifyUserCredential } from "../services/user-credential-auth.service";

const userRepo = new UserRepository();

const toOperatorAuthRoles = (
  roles: readonly ("anonymous" | OperatorAuthRole)[],
): OperatorAuthRole[] =>
  Array.from(new Set(roles.filter((role): role is OperatorAuthRole => role !== "anonymous")));

export const authenticateOperatorCredential = async (input: {
  userId: UserId;
  credential: string;
}): Promise<OperatorCredentialIdentity | null> => {
  const user = await userRepo.findById(input.userId);
  if (
    !user ||
    !hasAnyUserRole(user.role, ["service", "analytics"]) ||
    !(await verifyUserCredential(user, input.credential))
  ) {
    return null;
  }

  return {
    userId: user.id,
    roles: toOperatorAuthRoles(user.role),
  };
};
