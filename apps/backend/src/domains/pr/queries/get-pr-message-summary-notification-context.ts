import type { PRMessageId } from "../../../entities/pr-message";
import type { PRId } from "../../../entities/partner-request";
import type { UserId, UserRole } from "../../../entities/user";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PRMessageRepository } from "../../../repositories/PRMessageRepository";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const messageRepo = new PRMessageRepository();

export type PRMessageSummaryNotificationContextInput = {
  prId: PRId;
  recipientUserId: UserId;
  windowStartCursor: PRMessageId;
};

export type PRMessageSummaryNotificationContext =
  | {
      state: "READY";
      threadTitle: string;
      authorName: string;
      sentAt: string;
      messageSummary: string;
    }
  | {
      state: "SKIPPED";
      reason:
        | "PR_MISSING"
        | "PR_TERMINAL"
        | "RECIPIENT_NOT_ACTIVE_PARTICIPANT"
        | "MESSAGE_WINDOW_EMPTY";
    };

const resolveThreadTitle = (request: { id: PRId; title: string | null; type: string }): string =>
  request.title?.trim() || request.type.trim() || `PR#${request.id}`;

const resolveAuthorName = (nickname: string | null, role: UserRole | null): string =>
  role === "service" ? "系统消息" : nickname?.trim() || "搭子";

const formatMessageSentAt = (messageCreatedAt: Date): string =>
  messageCreatedAt.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatMessageSummary = (messageCount: number): string =>
  `${Math.max(1, messageCount)}条留言，请尽快查看`;

/**
 * PR-owned projection for a claimed generic message window. It deliberately
 * knows neither a Job key nor user preference/provider state; Notification
 * supplies those concerns around this small current-state query.
 */
export const getPRMessageSummaryNotificationContext = async (
  input: PRMessageSummaryNotificationContextInput,
): Promise<PRMessageSummaryNotificationContext> => {
  const [request, recipientPartner] = await Promise.all([
    prRepo.findById(input.prId),
    partnerRepo.findActiveByPrIdAndUserId(input.prId, input.recipientUserId),
  ]);
  if (!request) {
    return { state: "SKIPPED", reason: "PR_MISSING" };
  }
  if (request.status === "CLOSED" || request.status === "EXPIRED") {
    return { state: "SKIPPED", reason: "PR_TERMINAL" };
  }
  if (!recipientPartner) {
    return { state: "SKIPPED", reason: "RECIPIENT_NOT_ACTIVE_PARTICIPANT" };
  }

  const [latestMessage, messageCount] = await Promise.all([
    messageRepo.findLatestWithAuthorAtOrAfterId(input.prId, input.windowStartCursor),
    messageRepo.countByPrIdAtOrAfterId(input.prId, input.windowStartCursor),
  ]);
  if (!latestMessage) {
    return { state: "SKIPPED", reason: "MESSAGE_WINDOW_EMPTY" };
  }

  return {
    state: "READY",
    threadTitle: resolveThreadTitle(request),
    authorName: resolveAuthorName(latestMessage.authorNickname, latestMessage.authorRole),
    sentAt: formatMessageSentAt(latestMessage.createdAt),
    messageSummary: formatMessageSummary(messageCount),
  };
};
