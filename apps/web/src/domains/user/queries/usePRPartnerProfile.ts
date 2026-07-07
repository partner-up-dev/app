import { useQuery } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, type Ref } from "vue";
import { client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";
import { queryKeys } from "@/shared/api/query-keys";

type PRPartnerProfileResponse = InferResponseType<
  (typeof client.api.pr)[":id"]["partners"][":partnerId"]["profile"]["$get"]
>;

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  const payload = (await response.json()) as { error?: string };
  return payload.error || fallback;
};

export const usePRPartnerProfile = (
  prId: Ref<number | null>,
  partnerId: Ref<number | null>,
) => {
  const queryKey = computed(() =>
    queryKeys.pr.partnerProfile(prId.value, partnerId.value),
  );

  return useQuery<PRPartnerProfileResponse>({
    queryKey,
    queryFn: async () => {
      const activePrId = prId.value;
      const activePartnerId = partnerId.value;

      if (activePrId === null || activePartnerId === null) {
        throw new Error(i18n.global.t("errors.fetchRequestFailed"));
      }

      const res = await client.api.pr[":id"].partners[":partnerId"].profile.$get(
        {
          param: {
            id: activePrId.toString(),
            partnerId: activePartnerId.toString(),
          },
        },
      );

      if (!res.ok) {
        throw new Error(
          await readErrorMessage(res, i18n.global.t("errors.fetchRequestFailed")),
        );
      }

      return await res.json();
    },
    enabled: () => prId.value !== null && partnerId.value !== null,
  });
};
