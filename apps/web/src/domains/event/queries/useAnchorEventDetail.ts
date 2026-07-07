import { useQuery } from "@tanstack/vue-query";
import { computed, unref, type MaybeRef, type Ref } from "vue";
import { client } from "@/lib/rpc";
import type { AnchorEventDetailResponse } from "@/domains/event/model/types";
import { queryKeys } from "@/shared/api/query-keys";

export const useAnchorEventDetail = (
  eventId: Ref<number | null>,
  enabled: MaybeRef<boolean> = true,
) => {
  const queryKey = computed(() => queryKeys.anchorEvent.detail(eventId.value));

  return useQuery<AnchorEventDetailResponse>({
    queryKey,
    queryFn: async () => {
      const id = eventId.value;
      if (id === null) {
        throw new Error("缺少活动 ID");
      }
      const res = await client.api.events[":eventId"].$get({
        param: { eventId: id.toString() },
      });
      if (!res.ok) {
        throw new Error("获取活动详情失败");
      }
      return await res.json();
    },
    enabled: () => eventId.value !== null && unref(enabled),
  });
};
