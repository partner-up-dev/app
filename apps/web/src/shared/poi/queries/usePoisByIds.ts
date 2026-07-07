import { computed, type Ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";

export type PoisByNamesResponse = InferResponseType<
  (typeof client.api.pois)["by-names"]["$get"]
>;

export const usePoisByNames = (namesCsv: Ref<string | null>) => {
  const normalizedNamesCsv = computed(() => {
    const rawValue = namesCsv.value;
    if (!rawValue) return "";
    return rawValue
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
      .join(",");
  });

  const queryKey = computed(() => queryKeys.poi.byNames(normalizedNamesCsv.value));

  return useQuery<PoisByNamesResponse>({
    queryKey,
    queryFn: async () => {
      const names = normalizedNamesCsv.value;
      if (!names) {
        return [];
      }

      const res = await client.api.pois["by-names"].$get({
        query: { names },
      });

      if (!res.ok) {
        throw new Error("获取场地图片失败");
      }

      return await res.json();
    },
    enabled: () => normalizedNamesCsv.value.length > 0,
  });
};

export const usePoisByIds = usePoisByNames;
