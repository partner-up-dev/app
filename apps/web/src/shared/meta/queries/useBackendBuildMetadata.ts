import { useQuery } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { i18n } from "@/locales/i18n";

export type BackendBuildMetadataResponse = InferResponseType<
  (typeof client.api.meta.build)["$get"]
>;

export const useBackendBuildMetadata = () =>
  useQuery<BackendBuildMetadataResponse>({
    queryKey: queryKeys.meta.build(),
    queryFn: async () => {
      const res = await client.api.meta.build.$get();

      if (!res.ok) {
        throw new Error(i18n.global.t("errors.fetchBackendBuildMetadataFailed"));
      }

      return await res.json();
    },
  });
