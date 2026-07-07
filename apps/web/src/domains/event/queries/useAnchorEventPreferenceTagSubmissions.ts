import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import type { AnchorEventPreferenceTagSubmissionResponse } from "@/domains/event/model/types";
import { queryKeys } from "@/shared/api/query-keys";

export const useAnchorEventPreferenceTagSubmissions = () => {
  const queryClient = useQueryClient();

  return useMutation<
    AnchorEventPreferenceTagSubmissionResponse,
    Error,
    { eventId: number; labels: string[] }
  >({
    mutationFn: async ({ eventId, labels }) => {
      const response = await client.api.events[":eventId"]["preference-tags"][
        "submissions"
      ].$post({
        param: {
          eventId: eventId.toString(),
        },
        json: {
          labels,
        },
      });

      if (!response.ok) {
        throw new Error("提交偏好标签失败");
      }

      return await response.json();
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.anchorEvent.formMode(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.anchorEventPreferenceTags(variables.eventId),
      });
    },
  });
};
