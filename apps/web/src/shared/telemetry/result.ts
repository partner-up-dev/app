import type { ApiError } from "@/shared/api/error";
import type { TelemetryActionResult } from "@/shared/telemetry/events";

export type TelemetryFailurePayload = {
  actionResult: Extract<TelemetryActionResult, "failure" | "blocked">;
  failureCode: string;
  failureReason: string;
};

const AUTH_BLOCKING_CODES = new Set([
  "AUTHENTICATED_REQUIRED",
  "WECHAT_AUTH_REQUIRED",
  "WECHAT_BIND_REQUIRED",
]);

const asApiError = (error: unknown): ApiError | null =>
  error instanceof Error ? (error as ApiError) : null;

export const resolveTelemetryFailurePayload = (
  error: unknown,
  fallbackCode: string,
  fallbackReason: string,
): TelemetryFailurePayload => {
  const apiError = asApiError(error);
  const failureCode =
    apiError?.code ??
    apiError?.type ??
    (typeof apiError?.status === "number"
      ? `HTTP_${apiError.status}`
      : fallbackCode);
  const failureReason = apiError?.message || fallbackReason;

  return {
    actionResult: AUTH_BLOCKING_CODES.has(failureCode) ? "blocked" : "failure",
    failureCode,
    failureReason,
  };
};
