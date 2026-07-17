import { and, desc, eq } from "drizzle-orm";
import { partners, type PartnerId, type PartnerStatus, users } from "../../../../src/entities";
import { getTestDb } from "../../../_infra/probes/sql-probe";
import type { ScenarioPartnerRequest } from "../builders/partner-requests";
import type { ScenarioUser } from "../builders/users";

export type PartnerSlotProbe = {
  id: PartnerId;
  status: PartnerStatus;
  didAttend: boolean | null;
};

export type UserPhoneProbe = {
  userId: string;
  phoneNumber: string | null;
};

export async function probeLatestPartnerSlot(input: {
  pr: ScenarioPartnerRequest;
  user: ScenarioUser;
}): Promise<PartnerSlotProbe | null> {
  const [slot] = await getTestDb()
    .select({
      id: partners.id,
      status: partners.status,
      didAttend: partners.didAttend,
    })
    .from(partners)
    .where(and(eq(partners.prId, input.pr.id), eq(partners.userId, input.user.user.id)))
    .orderBy(desc(partners.id));

  return slot ?? null;
}

export async function probeUserPhone(user: ScenarioUser): Promise<UserPhoneProbe | null> {
  const [record] = await getTestDb()
    .select({
      userId: users.id,
      phoneNumber: users.phoneNumber,
    })
    .from(users)
    .where(eq(users.id, user.user.id));

  return record ?? null;
}
