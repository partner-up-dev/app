export type NotificationDispatchFailureReason =
  | "CHANNEL_NOT_CONFIGURED"
  | "RECIPIENT_PERMISSION_REVOKED"
  | "TRANSPORT_ERROR";

export type NotificationDispatchSendResult =
  | {
      status: "SENT";
      providerMessageId: string | number | null;
    }
  | {
      status: "FAILED";
      reason: NotificationDispatchFailureReason;
      errorCode: string | null;
      errorMessage: string;
    };

export const isRecipientPermissionRevoked = (result: NotificationDispatchSendResult): boolean =>
  result.status === "FAILED" && result.reason === "RECIPIENT_PERMISSION_REVOKED";

export const toDispatchFailureError = (
  result: Extract<NotificationDispatchSendResult, { status: "FAILED" }>,
): Error =>
  new Error(result.errorCode ? `${result.errorCode}: ${result.errorMessage}` : result.errorMessage);
