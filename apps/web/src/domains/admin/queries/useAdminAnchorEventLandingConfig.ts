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

export type AdminAnchorEventLandingConfigResponse = InferResponseType<
  (typeof adminClient.api.admin.events)[":eventId"]["landing-config"]["$get"]
>;

export type ReplaceAdminAnchorEventLandingConfigResponse = InferResponseType<
  (typeof adminClient.api.admin.events)[":eventId"]["landing-config"]["$put"]
>;

export type AdminAnchorEventLandingConfigInput = {
  variantRatioOverride: {
    FORM: number;
    CARD_RICH: number;
    LIST: number;
  } | null;
  assignmentRevision: number;
};

export const useAdminAnchorEventLandingConfig = (
  eventId: Ref<number | null>,
  enabled?: Ref<boolean>,
) =>
  useQuery<AdminAnchorEventLandingConfigResponse>({
    queryKey: computed(() => queryKeys.admin.anchorEventLandingConfig(eventId.value)),
    queryFn: async () => {
      const id = eventId.value;
      if (id === null) {
        throw new Error("缺少活动 ID");
      }

      const res = await adminClient.api.admin.events[":eventId"][
        "landing-config"
      ].$get({
        param: { eventId: id.toString() },
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "获取 landing 配置失败"));
      }

      return await res.json();
    },
    enabled: () => eventId.value !== null && (enabled?.value ?? true),
  });

export const useReplaceAdminAnchorEventLandingConfig = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ReplaceAdminAnchorEventLandingConfigResponse,
    Error,
    { eventId: number; input: AdminAnchorEventLandingConfigInput }
  >({
    mutationFn: async ({ eventId, input }) => {
      const res = await adminClient.api.admin.events[":eventId"][
        "landing-config"
      ].$put({
        param: { eventId: eventId.toString() },
        json: input,
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "保存 landing 配置失败"));
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.anchorEventLandingConfig(variables.eventId),
      });
    },
  });
};
