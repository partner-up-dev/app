import type { PRRoute } from "@partner-up-dev/backend";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, type Ref } from "vue";
import { client } from "@/lib/rpc";
import { readApiErrorPayload, resolveApiErrorMessage } from "@/shared/api/error";
import { queryKeys } from "@/shared/api/query-keys";

export type PRAuthoringRouteApplication = InferResponseType<
  (typeof client.api.pr.authoring)["route-applications"]["mine"]["$get"]
>[number];
export type PRAuthoringRouteApplicationStatus = PRAuthoringRouteApplication["status"];

const readError = async (response: Response, fallback: string): Promise<Error> => {
  const payload = await readApiErrorPayload(response);
  return new Error(resolveApiErrorMessage(payload, fallback));
};

export const useMyPRAuthoringRouteApplications = (
  type: Ref<string | null>,
  enabled: Ref<boolean> = computed(() => true),
) =>
  useQuery({
    queryKey: computed(() => queryKeys.prAuthoring.routeApplicationsMine(type.value)),
    queryFn: async () => {
      const response = await client.api.pr.authoring["route-applications"].mine.$get();
      if (!response.ok) throw await readError(response, "获取路线申请失败");
      const applications = await response.json();
      return type.value
        ? applications.filter((application) => application.type === type.value)
        : applications;
    },
    enabled: () => enabled.value && type.value !== null,
  });

export const useSubmitPRAuthoringRouteApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { type: string; route: PRRoute }) => {
      const response = await client.api.pr.authoring["route-applications"].$post({ json: input });
      if (!response.ok) throw await readError(response, "提交路线申请失败");
      return await response.json();
    },
    onSuccess: (application) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.prAuthoring.routeApplicationsMine(application.type),
      });
    },
  });
};
