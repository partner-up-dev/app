import { useQuery } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import type { AnchorEventListResponse } from "@/domains/event/model/types";
import { queryKeys } from "@/shared/api/query-keys";

export const useAnchorEvents = () => {
  return useQuery<AnchorEventListResponse>({
    queryKey: queryKeys.anchorEvent.list(),
    queryFn: async () => {
      const res = await client.api.events.$get();
      if (!res.ok) {
        throw new Error("获取活动列表失败");
      }
      return await res.json();
    },
  });
};
