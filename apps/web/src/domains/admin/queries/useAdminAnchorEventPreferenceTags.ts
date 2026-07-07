import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, type Ref } from "vue";
import { adminClient } from "@/lib/admin-rpc";
import { queryKeys } from "@/shared/api/query-keys";

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  const payload = (await response.json()) as { error?: string };
  return payload.error || fallback;
};

export type AdminAnchorEventPreferenceTagsResponse = InferResponseType<
  (typeof adminClient.api.admin.events)[":eventId"]["preference-tags"]["$get"]
>;

export const useAdminAnchorEventPreferenceTags = (
  eventId: Ref<number | null>,
  enabled?: Ref<boolean>,
) =>
  useQuery<AdminAnchorEventPreferenceTagsResponse>({
    queryKey: computed(() => queryKeys.admin.anchorEventPreferenceTags(eventId.value)),
    queryFn: async () => {
      const id = eventId.value;
      if (id === null) {
        throw new Error("缺少活动 ID");
      }

      const response = await adminClient.api.admin.events[":eventId"][
        "preference-tags"
      ].$get({
        param: {
          eventId: id.toString(),
        },
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "获取偏好标签失败"));
      }

      return await response.json();
    },
    enabled: () => eventId.value !== null && (enabled?.value ?? true),
  });

export const useReplaceAdminAnchorEventPreferenceTags = () => {
  const queryClient = useQueryClient();

  return useMutation<
    AdminAnchorEventPreferenceTagsResponse,
    Error,
    {
      eventId: number;
      tags: Array<{
        label: string;
        description: string | null;
      }>;
    }
  >({
    mutationFn: async ({ eventId, tags }) => {
      const response = await adminClient.api.admin.events[":eventId"][
        "preference-tags"
      ]["published"].$put({
        param: {
          eventId: eventId.toString(),
        },
        json: {
          tags,
        },
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "保存偏好标签失败"));
      }

      return await response.json();
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.anchorEventPreferenceTags(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.anchorEvent.formMode(variables.eventId),
      });
    },
  });
};

const buildPreferenceTagModerationMutation = (action: "publish" | "reject") => {
  const queryClient = useQueryClient();

  return useMutation<
    AdminAnchorEventPreferenceTagsResponse,
    Error,
    { eventId: number; tagId: number }
  >({
    mutationFn: async ({ eventId, tagId }) => {
      const response = await adminClient.api.admin.events[":eventId"][
        "preference-tags"
      ][":tagId"][action].$post({
        param: {
          eventId: eventId.toString(),
          tagId: tagId.toString(),
        },
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "更新偏好标签失败"));
      }

      return await response.json();
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.anchorEventPreferenceTags(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.anchorEvent.formMode(variables.eventId),
      });
    },
  });
};

export const usePublishAdminAnchorEventPreferenceTag = () =>
  buildPreferenceTagModerationMutation("publish");

export const useRejectAdminAnchorEventPreferenceTag = () =>
  buildPreferenceTagModerationMutation("reject");
