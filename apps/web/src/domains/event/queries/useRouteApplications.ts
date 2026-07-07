import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, unref, type MaybeRef } from "vue";
import type { PRRoute } from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  const payload = (await response.json()) as {
    detail?: string;
    error?: string;
  };
  return payload.detail || payload.error || fallback;
};

type EventsApi = typeof client.api.events;
type EventRoute = EventsApi[":eventId"];
type RouteApplicationsRoute = EventRoute["route-applications"];

export type MyAnchorEventRouteApplicationsResponse = InferResponseType<
  EventsApi["route-applications"]["mine"]["$get"]
>;

export type SubmitAnchorEventRouteApplicationResponse = InferResponseType<
  RouteApplicationsRoute["$post"]
>;

export const useMyAnchorEventRouteApplications = (
  enabled: MaybeRef<boolean> = true,
) =>
  useQuery<MyAnchorEventRouteApplicationsResponse>({
    queryKey: queryKeys.anchorEvent.routeApplicationsMine(),
    queryFn: async () => {
      const response =
        await client.api.events["route-applications"].mine.$get();
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "获取路线申请失败"));
      }
      return await response.json();
    },
    enabled: computed(() => unref(enabled)),
  });

export const useSubmitAnchorEventRouteApplication = () => {
  const queryClient = useQueryClient();

  return useMutation<
    SubmitAnchorEventRouteApplicationResponse,
    Error,
    { eventId: number; route: PRRoute }
  >({
    mutationFn: async ({ eventId, route }) => {
      const response = await client.api.events[":eventId"][
        "route-applications"
      ].$post({
        param: { eventId: eventId.toString() },
        json: { route },
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "提交路线申请失败"));
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.anchorEvent.routeApplicationsMine(),
      });
    },
  });
};
