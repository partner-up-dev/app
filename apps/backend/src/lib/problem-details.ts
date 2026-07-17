type ProblemStatus = number;

type LocalizedProblemText = {
  zhCN: {
    title: string;
    detail: string;
  };
  enUS: {
    title: string;
    detail: string;
  };
};

export type ProblemDetailsPayload = {
  type: string;
  title: string;
  status: ProblemStatus;
  detail: string;
  code?: string;
};

export class ProblemDetailsError extends Error {
  readonly status: ProblemStatus;

  readonly type: string;

  readonly localizedText: LocalizedProblemText;

  readonly code: string | null;

  constructor(input: {
    status: ProblemStatus;
    type: string;
    code?: string;
    localizedText: LocalizedProblemText;
  }) {
    super(input.localizedText.zhCN.detail);
    this.name = "ProblemDetailsError";
    this.status = input.status;
    this.type = input.type;
    this.code = input.code ?? null;
    this.localizedText = input.localizedText;
  }
}

export const createHttpProblem = (input: {
  status: ProblemStatus;
  detail: string;
  code?: string;
  type?: string;
}): ProblemDetailsError => {
  const status =
    Number.isInteger(input.status) && input.status >= 400 && input.status <= 599
      ? input.status
      : 500;
  const title = titleByStatus(status);

  return new ProblemDetailsError({
    status,
    type: input.type ?? `https://partner-up.app/problems/http.${status}`,
    ...(input.code ? { code: input.code } : {}),
    localizedText: {
      zhCN: {
        title,
        detail: input.detail,
      },
      enUS: {
        title,
        detail: input.detail,
      },
    },
  });
};

export const throwHttpProblem = (input: {
  status: ProblemStatus;
  detail: string;
  code?: string;
  type?: string;
}): never => {
  throw createHttpProblem(input);
};

const resolveProblemLocale = (acceptLanguageHeader: string | undefined): "zh-CN" | "en-US" => {
  const normalized = acceptLanguageHeader?.trim();
  if (!normalized) {
    return "zh-CN";
  }

  const preferences = normalized
    .split(",")
    .map((entry, index) => {
      const [languageTagRaw = "", ...parameterParts] = entry
        .trim()
        .split(";")
        .map((part) => part.trim());
      const qualityParameter = parameterParts.find((part) => part.toLowerCase().startsWith("q="));
      const parsedQuality = qualityParameter === undefined ? 1 : Number(qualityParameter.slice(2));
      const quality = Number.isFinite(parsedQuality) && parsedQuality >= 0 ? parsedQuality : 1;
      return {
        index,
        languageTag: languageTagRaw.toLowerCase(),
        quality,
      };
    })
    .filter((preference) => preference.languageTag.length > 0)
    .sort((left, right) => {
      if (left.quality !== right.quality) {
        return right.quality - left.quality;
      }
      return left.index - right.index;
    });

  for (const preference of preferences) {
    if (preference.languageTag.startsWith("zh")) {
      return "zh-CN";
    }
    if (preference.languageTag.startsWith("en")) {
      return "en-US";
    }
  }

  return "zh-CN";
};

export const buildProblemDetailsPayload = (
  error: ProblemDetailsError,
  acceptLanguageHeader: string | undefined,
): { payload: ProblemDetailsPayload; contentLanguage: "zh-CN" | "en-US" } => {
  const contentLanguage = resolveProblemLocale(acceptLanguageHeader);
  const text = contentLanguage === "en-US" ? error.localizedText.enUS : error.localizedText.zhCN;

  return {
    contentLanguage,
    payload: {
      type: error.type,
      title: text.title,
      status: error.status,
      detail: text.detail,
      ...(error.code ? { code: error.code } : {}),
    },
  };
};

const titleByStatus = (status: number): string => {
  if (status === 400) return "Bad Request";
  if (status === 401) return "Unauthorized";
  if (status === 403) return "Forbidden";
  if (status === 404) return "Not Found";
  if (status === 409) return "Conflict";
  if (status === 422) return "Unprocessable Content";
  if (status === 503) return "Service Unavailable";
  if (status >= 500) return "Internal Server Error";
  return "Request Failed";
};

export const buildGenericProblemDetailsPayload = (input: {
  status: number;
  detail: string;
  code?: string;
  type?: string;
}): ProblemDetailsPayload => {
  const status =
    Number.isInteger(input.status) && input.status >= 400 && input.status <= 599
      ? input.status
      : 500;
  const title = titleByStatus(status);

  return {
    type: input.type ?? `https://partner-up.app/problems/http.${status}`,
    title,
    status,
    detail: input.detail,
    ...(input.code ? { code: input.code } : {}),
  };
};
