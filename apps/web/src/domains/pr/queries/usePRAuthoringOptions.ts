import { useQuery } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import type { PRAuthoringOptions } from "@/domains/pr/contracts";
import { client } from "@/lib/rpc";
import { readApiErrorPayload, resolveApiErrorMessage } from "@/shared/api/error";
import { queryKeys } from "@/shared/api/query-keys";

export type { PRAuthoringOptions } from "@/domains/pr/contracts";

export const usePRAuthoringOptions = (type: Ref<string | null>) =>
  useQuery<PRAuthoringOptions>({
    queryKey: computed(() => queryKeys.prAuthoring.options(type.value)),
    queryFn: async () => {
      const value = type.value;
      if (!value) throw new Error("PR 类型不能为空");
      const response = await client.api.pr.authoring.options.$get({ query: { type: value } });
      if (!response.ok) {
        const payload = await readApiErrorPayload(response);
        throw new Error(resolveApiErrorMessage(payload, "无法加载 PR 创建建议"));
      }
      return await response.json();
    },
    enabled: () => type.value !== null,
  });
