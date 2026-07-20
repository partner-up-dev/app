import type { ApiErrorPayload } from "@/shared/api/error";

export const AUTHENTICATED_REQUIRED_CODE = "AUTHENTICATED_REQUIRED";

export const isAuthenticatedRequiredResponse = (
  status: number,
  payload: ApiErrorPayload | null,
): boolean => status === 401 && payload?.code === AUTHENTICATED_REQUIRED_CODE;
