import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { i18n } from "@/locales/i18n";

type UpdateCurrentUserAvatarInput = {
  avatar: File;
};

export const useUpdateCurrentUserAvatar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ avatar }: UpdateCurrentUserAvatarInput) => {
      const res = await client.api.users.me.avatar.$post({
        form: { avatar },
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(
          error.error || i18n.global.t("errors.updateCurrentUserAvatarFailed"),
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
