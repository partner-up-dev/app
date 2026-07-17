import { and, eq, inArray } from "drizzle-orm";
import { getTestDb } from "../../../_infra/probes/sql-probe";
import { partners } from "../../../../src/entities/partner";
import type { PRId } from "../../../../src/entities/partner-request";
import type { UserId } from "../../../../src/entities/user";

export async function probeActiveParticipantCount(prId: PRId): Promise<number> {
  const rows = await getTestDb()
    .select({ id: partners.id })
    .from(partners)
    .where(
      and(eq(partners.prId, prId), inArray(partners.status, ["JOINED", "CONFIRMED", "ATTENDED"])),
    );
  return rows.length;
}

export async function probeActiveParticipantUserIds(prId: PRId): Promise<UserId[]> {
  const rows = await getTestDb()
    .select({ userId: partners.userId })
    .from(partners)
    .where(
      and(eq(partners.prId, prId), inArray(partners.status, ["JOINED", "CONFIRMED", "ATTENDED"])),
    );
  return rows.map((row) => row.userId);
}
