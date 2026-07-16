import type {
  PartnerRequestFields,
  PRAllowEditAfterReady,
  PRId,
  PRStatus,
  WeekdayLabel,
} from "@partner-up-dev/backend";
import { useMutation } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";
import { readApiErrorPayload, resolveApiErrorMessage } from "@/shared/api/error";

export type CreatePRResult = {
  id: PRId;
  status: PRStatus;
  canonicalPath: string;
};

type CreatePRFromNaturalLanguageInput = {
  rawText: string;
  nowIso: string;
  nowWeekday: WeekdayLabel;
};

type CreatePRFromStructuredInput = {
  fields: PartnerRequestFields;
  createSource?: "STRUCTURED_FORM" | "PR_DISCOVERY";
  allowEditAfterReady?: PRAllowEditAfterReady | null;
};

export const readPRCreateErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  const payload = await readApiErrorPayload(response);
  if (payload?.code === "PR_TYPE_USER_CREATION_DISABLED") {
    return i18n.global.t("errors.prTypeUserCreationDisabled");
  }
  return resolveApiErrorMessage(payload, fallback);
};

export const useCreatePRFromNaturalLanguage = () => {
  return useMutation<CreatePRResult, Error, CreatePRFromNaturalLanguageInput>({
    mutationFn: async (input) => {
      const res = await client.api.pr.new.nl.$post({
        json: input,
      });

      if (!res.ok) {
        throw new Error(
          await readPRCreateErrorMessage(res, i18n.global.t("errors.createRequestFailed")),
        );
      }

      return await res.json();
    },
  });
};

export const useCreatePRFromStructured = () => {
  return useMutation<CreatePRResult, Error, CreatePRFromStructuredInput>({
    mutationFn: async (input) => {
      const res = await client.api.pr.new.form.$post({
        json: {
          fields: input.fields,
          createSource: input.createSource,
          allowEditAfterReady: input.allowEditAfterReady,
        },
      });

      if (!res.ok) {
        throw new Error(
          await readPRCreateErrorMessage(res, i18n.global.t("errors.createRequestFailed")),
        );
      }

      return await res.json();
    },
  });
};
