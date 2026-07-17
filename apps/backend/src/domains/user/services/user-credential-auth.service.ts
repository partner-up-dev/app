import bcrypt from "bcryptjs";
import type { User } from "../../../entities/user";

export async function verifyUserCredential(user: User, credential: string): Promise<boolean> {
  if (!user.pinHash) {
    return false;
  }

  return bcrypt.compare(credential, user.pinHash);
}
