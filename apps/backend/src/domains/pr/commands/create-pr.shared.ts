import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import type { PRStatus } from "../contracts/partner-request";
import type { CreatorIdentityInput } from "../services/creator-identity.service";
import { publishPR } from "./publish-pr";

export type CreatePRCommandResult = {
  id: PRId;
  createdBy: UserId | null;
  status: PRStatus;
  canonicalPath: string;
};

const buildCanonicalPRPath = (id: PRId): string => `/pr/${id}`;

const shouldPublishImmediately = (creatorIdentity: CreatorIdentityInput): boolean =>
  creatorIdentity.authenticatedUserId !== null || creatorIdentity.oauthOpenId !== null;

export const finalizeCreatedPR = async ({
  id,
  createdBy,
  creatorIdentity,
}: {
  id: PRId;
  createdBy: UserId | null;
  creatorIdentity: CreatorIdentityInput;
}): Promise<CreatePRCommandResult> => {
  if (!shouldPublishImmediately(creatorIdentity)) {
    return {
      id,
      createdBy,
      status: "DRAFT",
      canonicalPath: buildCanonicalPRPath(id),
    };
  }

  const published = await publishPR(id, creatorIdentity);
  return {
    id,
    createdBy: published.createdBy,
    status: published.pr.status,
    canonicalPath: buildCanonicalPRPath(id),
  };
};
