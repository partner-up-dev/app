import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import type { PartnerRequestFields } from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import {
  buildApiError,
  readApiErrorPayload,
  resolveApiErrorMessage,
  type ApiError,
} from "@/shared/api/error";
import {
  handleWeChatAuthRequiredError,
  isWeChatAuthRequiredError,
} from "@/processes/wechat/auth-error";
import { setPendingWeChatAction } from "@/processes/wechat/pending-wechat-action";

type CreateEventAssistedPRInput = {
  eventId: number;
  fields: PartnerRequestFields;
  routePoolEntryId?: string | null;
  handoff?: "event_assisted_create";
};

export type CreateEventAssistedPRResponse = InferResponseType<
  (typeof client.api.pr.new.form)["$post"]
>;

export type CreateEventAssistedPRError = ApiError & {
  status?: number;
};

export const buildEventAssistedPRCreateBody = (input: {
  fields: PartnerRequestFields;
}) => ({
  fields: input.fields,
  createSource: "EVENT_ASSISTED" as const,
});

export const useCreateEventAssistedPR = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CreateEventAssistedPRResponse,
    CreateEventAssistedPRError,
    CreateEventAssistedPRInput
  >({
    mutationFn: async ({ eventId, fields, handoff }) => {
      const response = await client.api.pr.new.form.$post(
        {
          json: buildEventAssistedPRCreateBody({
            fields,
          }),
        },
        {
          init: {
            credentials: "include",
          },
        },
      );

      if (!response.ok) {
        const payload = await readApiErrorPayload(response);
        if (
          typeof window !== "undefined" &&
          isWeChatAuthRequiredError(response.status, payload)
        ) {
          setPendingWeChatAction({
            kind: "EVENT_ASSISTED_PR_CREATE",
            eventId,
            handoff,
            fields: {
              type: fields.type,
              time: fields.time,
              location: fields.location ?? null,
              route: fields.route ?? null,
              minPartners: fields.minPartners,
              maxPartners: fields.maxPartners,
              preferences: [...fields.preferences],
            },
          });
          handleWeChatAuthRequiredError(
            response.status,
            payload,
            window.location.href,
          );
        }

        const error = buildApiError(
          resolveApiErrorMessage(payload, "建立活動上下文搭子失敗"),
          payload,
        ) as CreateEventAssistedPRError;
        error.status = response.status;
        throw error;
      }

      return await response.json();
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.anchorEvent.detail(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.anchorEvent.demandCards(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.anchorEvent.formMode(variables.eventId),
      });
    },
  });
};
