import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { readApiErrorPayload, resolveApiErrorMessage } from "@/shared/api/error";
import { queryKeys } from "@/shared/api/query-keys";

type PreferenceTagsRoute = (typeof client.api.pr.authoring)["preference-tags"];
export type PRAuthoringPreferenceTagInput = InferRequestType<PreferenceTagsRoute["$post"]>["json"];
export type PRAuthoringPreferenceTagResponse = InferResponseType<PreferenceTagsRoute["$post"]>;

export const useSubmitPRAuthoringPreferenceTags = () => {
  const queryClient = useQueryClient();

  return useMutation<PRAuthoringPreferenceTagResponse, Error, PRAuthoringPreferenceTagInput>({
    mutationFn: async (input) => {
      const response = await client.api.pr.authoring["preference-tags"].$post({ json: input });
      if (!response.ok) {
        const payload = await readApiErrorPayload(response);
        throw new Error(resolveApiErrorMessage(payload, "提交偏好标签候选失败"));
      }
      return await response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prAuthoring.options(result.type) });
    },
  });
};
