import { useQuery } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import { client } from "@/lib/rpc";
import type { AnchorEventFormModeResponse } from "@/domains/event/model/types";
import { queryKeys } from "@/shared/api/query-keys";

export const useAnchorEventFormModeData = (eventId: Ref<number | null>) =>
  useQuery<AnchorEventFormModeResponse>({
    queryKey: computed(() => queryKeys.anchorEvent.formMode(eventId.value)),
    queryFn: async () => {
      const id = eventId.value;
      if (id === null) {
        throw new Error("缺少活动 ID");
      }

      const response = await client.api.events[":eventId"]["form-mode"].$get({
        param: {
          eventId: id.toString(),
        },
      });

      if (!response.ok) {
        throw new Error("获取 Form Mode 数据失败");
      }

      return await response.json();
    },
    enabled: () => eventId.value !== null,
  });
