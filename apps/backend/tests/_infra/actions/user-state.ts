import { eq } from "drizzle-orm";
import { userIdSchema, type UserStatus, users } from "../../../src/entities/user";
import { getTestDb } from "../probes/sql-probe";

/**
 * Changes persisted user state as scenario setup, without exposing Drizzle
 * dependencies to root-owned cross-unit scenarios.
 */
export async function setTestUserStatus(input: {
  userId: string;
  status: UserStatus;
}): Promise<void> {
  await getTestDb()
    .update(users)
    .set({ status: input.status })
    .where(eq(users.id, userIdSchema.parse(input.userId)));
}
