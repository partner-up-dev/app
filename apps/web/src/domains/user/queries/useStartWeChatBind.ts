import { useMutation } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";

type StartWeChatBindInput = {
  returnTo: string;
};

type StartWeChatBindResponse = {
  authorizeUrl: string;
};

export const useStartWeChatBind = () =>
  useMutation({
    mutationFn: async ({
      returnTo,
    }: StartWeChatBindInput): Promise<StartWeChatBindResponse> => {
      const res = await client.api.wechat.oauth.bind.$get(
        {
          query: { returnTo },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(
          error.error || i18n.global.t("errors.startWechatBindFailed"),
        );
      }

      return await res.json();
    },
  });
