import type { PartnerId } from "../../../entities/partner";
import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import {
  createPRParticipantReleaseTransactionPort,
  type ExitActivePRParticipantResult,
  type ReleaseAdminPRParticipantResult,
  type ReleaseUnconfirmedPRParticipantsResult,
} from "../adapters/pr-participant-release-transaction";

const participantReleaseTransaction = createPRParticipantReleaseTransactionPort();

export const exitActivePRParticipant = (input: {
  prId: PRId;
  userId: UserId;
}): Promise<ExitActivePRParticipantResult> => participantReleaseTransaction.exitActive(input);

export const releasePRParticipantByAdmin = (input: {
  prId: PRId;
  partnerId: PartnerId;
  releaseReason: string;
}): Promise<ReleaseAdminPRParticipantResult> => participantReleaseTransaction.releaseByAdmin(input);

export const releaseUnconfirmedPRParticipants = (input: {
  prId: PRId;
}): Promise<ReleaseUnconfirmedPRParticipantsResult> =>
  participantReleaseTransaction.releaseUnconfirmed(input);
