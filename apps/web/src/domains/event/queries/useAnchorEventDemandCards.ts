import { useQuery } from "@tanstack/vue-query";
import { computed, unref, type MaybeRef, type Ref } from "vue";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import type { AnchorEventDemandCardsResponse } from "@/domains/event/model/types";

export const useAnchorEventDemandCards = (
  eventId: Ref<number | null>,
  enabled: MaybeRef<boolean> = true,
) => {
  return useQuery<AnchorEventDemandCardsResponse>({
    queryKey: computed(() => queryKeys.anchorEvent.demandCards(eventId.value)),
    queryFn: async () => {
      const id = eventId.value;
      if (id === null) {
        throw new Error("缺少活动 ID");
      }

      const res = await client.api.events[":eventId"]["demand-cards"].$get({
        param: { eventId: id.toString() },
      });
      if (!res.ok) {
        throw new Error("获取活动卡片失败");
      }

      return await res.json();
    },
    enabled: () => eventId.value !== null && unref(enabled),
  });
};
