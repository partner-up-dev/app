import { useMutation } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import type { PRId } from "@partner-up-dev/backend";
import { i18n } from "@/locales/i18n";

export type PosterHtmlResponse = {
  html: string;
  width: number;
  height: number;
  backgroundColor?: string;
  meta?: {
    keyText?: string;
  };
};

export const useGenerateXhsPosterHtml = () => {
  return useMutation({
    mutationFn: async (params: {
      prId: PRId;
      caption: string;
      posterStylePrompt: string;
    }): Promise<PosterHtmlResponse> => {
      const res = await client.api.share.xiaohongshu["poster-html"].$post({
        json: {
          prId: params.prId,
          caption: params.caption,
          posterStylePrompt: params.posterStylePrompt,
        },
      });

      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        throw new Error(
          payload.error ?? i18n.global.t("errors.generateXhsPosterHtmlFailed"),
        );
      }

      return (await res.json()) as PosterHtmlResponse;
    },
  });
};
