export type ApiErrorPayload = {
  error?: string;
  title?: string;
  detail?: string;
  code?: string;
  type?: string;
  status?: number;
};

export type ApiError = Error & {
  code?: string;
  type?: string;
  status?: number;
};

export const readApiErrorPayload = async (
  response: Response,
): Promise<ApiErrorPayload | null> => {
  try {
    return (await response.json()) as ApiErrorPayload;
  } catch {
    return null;
  }
};

export const resolveApiErrorMessage = (
  payload: ApiErrorPayload | null,
  fallback: string,
): string => {
  return payload?.detail ?? payload?.error ?? fallback;
};

export const buildApiError = (
  message: string,
  payload: ApiErrorPayload | null,
): ApiError => {
  const error = new Error(message) as ApiError;
  if (payload?.code) {
    error.code = payload.code;
  }
  if (payload?.type) {
    error.type = payload.type;
  }
  if (typeof payload?.status === "number") {
    error.status = payload.status;
  }
  return error;
};
