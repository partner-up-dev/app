import { randomUUID } from "node:crypto";
import {
  issueAnonymousAuth,
  issueOperatorAuthForIdentity,
  issueUserAuth,
} from "../../../../src/auth/middleware";
import type { User } from "../../../../src/entities/user";
import { UserRepository } from "../../../../src/repositories/UserRepository";

const userRepo = new UserRepository();

export type ScenarioUser = {
  token: string;
  user: User;
};

export async function givenUser(
  label: string,
  options: { phoneNumber?: string | null } = {},
): Promise<ScenarioUser> {
  const user = await userRepo.create({
    id: randomUUID(),
    role: ["authenticated"],
    nickname: `scenario-${label}`,
    phoneNumber: options.phoneNumber ?? null,
    status: "ACTIVE",
  });

  if (!user) {
    throw new Error(`Failed to create scenario user: ${label}`);
  }

  return {
    user,
    token: issueUserAuth(user.id).token,
  };
}

export async function givenAnonymousUser(label: string): Promise<ScenarioUser> {
  const user = await userRepo.create({
    id: randomUUID(),
    role: ["anonymous"],
    nickname: `scenario-anonymous-${label}`,
    status: "ACTIVE",
  });

  if (!user) {
    throw new Error(`Failed to create scenario anonymous user: ${label}`);
  }

  return {
    user,
    token: issueAnonymousAuth(user.id).token,
  };
}

export async function givenAdminUser(label: string): Promise<ScenarioUser> {
  const user = await userRepo.create({
    id: randomUUID(),
    role: ["service", "analytics"],
    nickname: `scenario-admin-${label}`,
    status: "ACTIVE",
  });

  if (!user) {
    throw new Error(`Failed to create scenario admin user: ${label}`);
  }

  return {
    user,
    token: issueOperatorAuthForIdentity({
      userId: user.id,
      roles: user.role.filter((role) => role !== "anonymous"),
    }).token,
  };
}
