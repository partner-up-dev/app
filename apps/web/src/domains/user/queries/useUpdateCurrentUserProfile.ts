import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { i18n } from "@/locales/i18n";

type UpdateCurrentUserProfileInput = {
  nickname: string;
};

export const useUpdateCurrentUserProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ nickname }: UpdateCurrentUserProfileInput) => {
      const res = await client.api.users.me.$patch({
        json: { nickname },
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(
          error.error || i18n.global.t("errors.updateCurrentUserProfileFailed"),
        );
      }

      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.me(),
      });
    },
  });
};
