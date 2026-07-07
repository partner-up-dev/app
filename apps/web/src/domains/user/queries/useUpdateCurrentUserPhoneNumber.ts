import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { i18n } from "@/locales/i18n";

type UpdateCurrentUserPhoneNumberInput = {
  phoneNumber: string | null;
};

export const useUpdateCurrentUserPhoneNumber = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ phoneNumber }: UpdateCurrentUserPhoneNumberInput) => {
      const res = await client.api.users.me["phone-number"].$put({
        json: { phoneNumber },
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
