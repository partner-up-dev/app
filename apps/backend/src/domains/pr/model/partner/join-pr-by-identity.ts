import { throwHttpProblem } from "../../../../lib/problem-details";
import type { PRId } from "../../../../entities/partner-request";
import { hasUserRole, type User, type UserId } from "../../../../entities/user";
import { UserRepository } from "../../../../repositories/UserRepository";
import { resolveUserByOpenId } from "../../../user";
import { joinPRAsUser } from "../../../pr-core/use-cases/join-pr";
import { waitlistPRAsUser } from "../../../pr-core/use-cases/waitlist-pr";
import { throwAuthenticatedRequired } from "../../../pr-core/services/creator-identity.service";
import type { PublicPR } from "../../read-models/public-pr-view.service";

const userRepo = new UserRepository();

export type PRParticipantIdentityInput = {
  authenticatedUserId: UserId | null;
  anonymousUserId: UserId | null;
  oauthOpenId: string | null;
};

export type JoinPRByIdentityResult = {
  pr: PublicPR;
  userId: UserId;
};

export type WaitlistPRByIdentityResult = {
  pr: PublicPR;
  userId: UserId;
};

export const resolvePRParticipantUser = async (
  input: PRParticipantIdentityInput,
): Promise<{ user: User }> => {
  if (input.authenticatedUserId) {
    const user = await userRepo.findById(input.authenticatedUserId);
    if (!user || user.status !== "ACTIVE") {
      return throwHttpProblem({ status: 401, detail: "Invalid authenticated user" });
    }

    return {
      user,
    };
  }

  if (input.oauthOpenId) {
    const user = await resolveUserByOpenId(input.oauthOpenId);
    return {
      user,
    };
  }

  if (!input.anonymousUserId) {
    return throwAuthenticatedRequired();
  }

  const anonymous = await userRepo.findById(input.anonymousUserId);
  if (
    !anonymous ||
    anonymous.status !== "ACTIVE" ||
    !hasUserRole(anonymous.role, "anonymous")
  ) {
    return throwHttpProblem({ status: 401, detail: "Invalid anonymous user session" });
  }

  return {
    user: anonymous,
  };
};

export async function joinPRByIdentity(
  id: PRId,
  identity: PRParticipantIdentityInput,
): Promise<JoinPRByIdentityResult> {
  const participant = await resolvePRParticipantUser(identity);
  const pr = await joinPRAsUser(id, participant.user);

  return {
    pr,
    userId: participant.user.id,
  };
}

export async function waitlistPRByIdentity(
  id: PRId,
  identity: PRParticipantIdentityInput,
  options: {
    alternativePrReminderOptIn?: boolean;
  } = {},
): Promise<WaitlistPRByIdentityResult> {
  const participant = await resolvePRParticipantUser(identity);
  const pr = await waitlistPRAsUser(id, participant.user, {
    alternativePrReminderOptIn: options.alternativePrReminderOptIn,
  });

  return {
    pr,
    userId: participant.user.id,
  };
}
