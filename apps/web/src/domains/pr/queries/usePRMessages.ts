import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import type { InferResponseType } from "hono";
import type { PRId } from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";
import { queryKeys } from "@/shared/api/query-keys";
import { readApiErrorPayload, resolveApiErrorMessage } from "@/shared/api/error";

export type PRMessagesResponse = InferResponseType<
  (typeof client.api.pr)[":id"]["messages"]["$get"]
>;

export type CreatePRMessageResponse = InferResponseType<
  (typeof client.api.pr)[":id"]["messages"]["$post"]
>;

export type AcknowledgePRMessageAttentionResponse = InferResponseType<
  (typeof client.api.pr)[":id"]["messages"]["acknowledgement"]["$post"]
>;

export const usePRMessages = (id: Ref<PRId | null>) => {
  const queryKey = computed(() => queryKeys.pr.messages(id.value));

  return useQuery<PRMessagesResponse>({
    queryKey,
    queryFn: async () => {
      const prId = id.value;
      if (prId === null) {
        throw new Error(i18n.global.t("errors.missingPartnerRequestId"));
      }

      const res = await client.api.pr[":id"]["messages"].$get(
        {
          param: { id: prId.toString() },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );

      if (!res.ok) {
        const payload = await readApiErrorPayload(res);
        throw new Error(
          resolveApiErrorMessage(payload, i18n.global.t("errors.fetchRequestFailed")),
        );
      }

      return await res.json();
    },
    enabled: () => id.value !== null,
  });
};

export const useCreatePRMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: PRId; body: string }) => {
      const res = await client.api.pr[":id"]["messages"].$post(
        {
          param: { id: input.id.toString() },
          json: { body: input.body },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );

      if (!res.ok) {
        const payload = await readApiErrorPayload(res);
        throw new Error(resolveApiErrorMessage(payload, i18n.global.t("common.operationFailed")));
      }

      return await res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<PRMessagesResponse>(queryKeys.pr.messages(variables.id), (prev) => {
        if (!prev) {
          return {
            items: [data.message],
            thread: data.thread,
          };
        }

        return {
          items: [...prev.items, data.message],
          thread: data.thread,
        };
      });
    },
  });
};

/**
 * The visible-route workflow owns when this mutation runs. This transport hook
 * only carries the server-provided cursor back to the semantic PR endpoint.
 */
export const useAcknowledgePRMessageAttention = () => {
  return useMutation({
    mutationFn: async (input: { id: PRId; acknowledgementCursor: number }) => {
      const res = await client.api.pr[":id"]["messages"]["acknowledgement"].$post(
        {
          param: { id: input.id.toString() },
          json: { acknowledgementCursor: input.acknowledgementCursor },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );

      if (!res.ok) {
        const payload = await readApiErrorPayload(res);
        throw new Error(resolveApiErrorMessage(payload, i18n.global.t("common.operationFailed")));
      }

      return await res.json();
    },
  });
};
