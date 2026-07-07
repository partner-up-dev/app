import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, unref, type MaybeRef } from "vue";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  const payload = (await response.json()) as { error?: string };
  return payload.error || fallback;
};

export type MyPoiApplicationsResponse = InferResponseType<
  (typeof client.api.pois.applications.mine)["$get"]
>;

export type SubmitPoiApplicationResponse = InferResponseType<
  (typeof client.api.pois.applications)["$post"]
>;

export const useMyPoiApplications = (enabled: MaybeRef<boolean> = true) =>
  useQuery<MyPoiApplicationsResponse>({
    queryKey: queryKeys.poi.applicationsMine(),
    queryFn: async () => {
      const response = await client.api.pois.applications.mine.$get();
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "获取地点申请失败"));
      }
      return await response.json();
    },
    enabled: computed(() => unref(enabled)),
  });

export const useSubmitPoiApplication = () => {
  const queryClient = useQueryClient();

  return useMutation<
    SubmitPoiApplicationResponse,
    Error,
    { title: string; imageUrl: string }
  >({
    mutationFn: async ({ title, imageUrl }) => {
      const response = await client.api.pois.applications.$post({
        json: {
          title,
          imageUrl,
        },
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "提交地点申请失败"));
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.poi.applicationsMine(),
      });
    },
  });
};
