import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import type { PRId } from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";
import { queryKeys } from "@/shared/api/query-keys";
import {
  buildApiError,
  readApiErrorPayload,
  resolveApiErrorMessage,
} from "@/shared/api/error";
import {
  handleWeChatAuthRequiredError,
  isWeChatAuthRequiredError,
} from "@/processes/wechat/auth-error";
import { setPendingWeChatAction } from "@/processes/wechat/pending-wechat-action";

export type PublishPRResponse = InferResponseType<
  (typeof client.api.pr)[":id"]["publish"]["$post"]
>;

export const usePublishPR = () => {
  const queryClient = useQueryClient();

  return useMutation<PublishPRResponse, Error, { id: PRId }>({
    mutationFn: async ({ id }) => {
      const res = await client.api.pr[":id"].publish.$post({
        param: { id: id.toString() },
      });

      if (!res.ok) {
        const payload = await readApiErrorPayload(res);
        if (isWeChatAuthRequiredError(res.status, payload)) {
          setPendingWeChatAction({
            kind: "PR_PUBLISH",
            prId: id,
          });
        }
        if (
          typeof window !== "undefined" &&
          handleWeChatAuthRequiredError(res.status, payload, window.location.href)
        ) {
          throw buildApiError(
            resolveApiErrorMessage(
              payload,
              i18n.global.t("prPage.wechatReminder.loginHint"),
            ),
            payload,
          );
        }
        throw buildApiError(
          resolveApiErrorMessage(
            payload,
            i18n.global.t("errors.publishRequestFailed"),
          ),
          payload,
        );
      }

      return await res.json();
    },
    onSuccess: (_payload, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.mineCreated(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.mineJoined(),
      });
    },
  });
};
