import { randomUUID } from "crypto";
import { UserRepository } from "../../../repositories/UserRepository";
import type { UserId } from "../../../entities/user";

export type AnonymousRegistrationResult = {
  userId: UserId;
};

const userRepo = new UserRepository();

const generateUserId = (): UserId => randomUUID() as UserId;

export async function registerAnonymousUser(): Promise<AnonymousRegistrationResult> {
  const created = await userRepo.create({
    id: generateUserId(),
    openId: null,
    pinHash: null,
    role: ["anonymous"],
    status: "ACTIVE",
  });

  if (!created) {
    throw new Error("Failed to create anonymous user");
  }

  return {
    userId: created.id,
  };
}
