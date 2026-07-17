import { and, desc, eq, sql } from "drizzle-orm";
import { expectJsonResponse, requestJson } from "../../../_infra/http/backend-app";
import { getTestDb } from "../../../_infra/probes/sql-probe";
import { partners, type PartnerStatus } from "../../../../src/entities/partner";
import type { ScenarioPartnerRequest } from "../builders/partner-requests";
import type { ScenarioUser } from "../builders/users";

export type WaitlistDetailResponse = {
  partnerSection: {
    viewer: {
      isWaitlisted: boolean;
      waitlistRank: number | null;
      slotState: string;
      canWaitlist: boolean;
      pendingPartnerId: number | null;
    };
  };
};

export async function getWaitlistDetail(input: {
  pr: ScenarioPartnerRequest;
  user: ScenarioUser;
}): Promise<WaitlistDetailResponse> {
  return expectJsonResponse<WaitlistDetailResponse>(
    await requestJson(`/api/pr/${input.pr.id}`, {
      method: "GET",
      token: input.user.token,
    }),
    200,
  );
}

export async function probePartnerSlotStatus(input: {
  pr: ScenarioPartnerRequest;
  user: ScenarioUser;
}): Promise<PartnerStatus | undefined> {
  const [slot] = await getTestDb()
    .select({ status: partners.status })
    .from(partners)
    .where(and(eq(partners.prId, input.pr.id), eq(partners.userId, input.user.user.id)))
    .orderBy(desc(partners.id));
  return slot?.status;
}

export async function probePendingWaitlistCount(pr: ScenarioPartnerRequest): Promise<number> {
  const rows = await getTestDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(partners)
    .where(and(eq(partners.prId, pr.id), eq(partners.status, "PENDING")));
  return rows[0]?.count ?? 0;
}
