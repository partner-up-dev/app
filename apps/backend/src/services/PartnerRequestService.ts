/**
 * PartnerRequestService — thin facade.
 *
 * Delegates all business logic to the canonical `domains/pr` surface.
 * Kept for backward-compatibility with consumers that haven't migrated
 * to importing use-cases directly (ShareService, llm.controller,
 * wecom.controller).
 *
 * New code should import use-cases directly from `domains/pr`.
 */

import {
  createPRFromNaturalLanguage as createPRFromNLUseCase,
  createPRFromStructured as createPRStructuredUseCase,
  publishPR as publishPRUseCase,
  getPR as getPRUseCase,
  getMyCreatedPRs as getMyCreatedPRsUseCase,
  getMyJoinedPRs as getMyJoinedPRsUseCase,
  updatePRStatus as updatePRStatusUseCase,
  updatePRContent as updatePRContentUseCase,
  joinPR as joinPRUseCase,
  exitPR as exitPRUseCase,
} from "../domains/pr";
import type { CreatorIdentityInput, PublicPR } from "../domains/pr";
import type {
  PartnerRequestFields,
  PRId,
  PRStatusManual,
  WeekdayLabel,
} from "../entities/partner-request";
import type { UserId } from "../entities/user";

export class PartnerRequestService {
  async createPRFromNaturalLanguage(
    rawText: string,
    nowIso: string,
    nowWeekday: WeekdayLabel | null,
    creatorIdentity: CreatorIdentityInput,
  ) {
    return createPRFromNLUseCase(rawText, nowIso, nowWeekday, creatorIdentity);
  }

  async createPRFromStructured(
    fields: PartnerRequestFields,
    creatorIdentity: CreatorIdentityInput,
  ) {
    return createPRStructuredUseCase(fields, creatorIdentity);
  }

  async publishPR(id: PRId, creatorIdentity: CreatorIdentityInput) {
    return publishPRUseCase(id, creatorIdentity);
  }

  async getPR(id: PRId, viewerOpenId?: string | null): Promise<PublicPR> {
    return getPRUseCase(id, viewerOpenId);
  }

  async getMyCreatedPRs(userId: UserId) {
    return getMyCreatedPRsUseCase(userId);
  }

  async getMyJoinedPRs(userId: UserId) {
    return getMyJoinedPRsUseCase(userId);
  }

  async updatePRStatus(id: PRId, status: PRStatusManual, actorUserId: UserId | null) {
    return updatePRStatusUseCase(id, status, actorUserId);
  }

  async updatePRContent(id: PRId, fields: PartnerRequestFields, actorUserId: UserId | null) {
    return updatePRContentUseCase(id, fields, actorUserId);
  }

  async joinPRAsAuthenticatedUser(id: PRId, openId: string) {
    return joinPRUseCase(id, openId);
  }

  async exitPRAsAuthenticatedUser(id: PRId, openId: string) {
    return exitPRUseCase(id, openId);
  }
}
