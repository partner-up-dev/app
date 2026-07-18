import type { UserId } from "../../../entities/user";
import { UserRepository } from "../../../repositories/UserRepository";
import { classifyCurrentPublicUser } from "./public-user-identity";

const userRepository = new UserRepository();

/** Resolve the current persisted public identity for a subject-bound token. */
export const findCurrentPublicUserIdentity = async (userId: UserId) =>
  classifyCurrentPublicUser(await userRepository.findById(userId));
