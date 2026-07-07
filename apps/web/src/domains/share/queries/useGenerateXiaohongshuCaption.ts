import { useMutation } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import type { PRId } from "@partner-up-dev/backend";
import { i18n } from "@/locales/i18n";

export const useGenerateXiaohongshuCaption = () => {
  return useMutation({
    mutationFn: async ({ prId, style }: { prId: PRId; style?: number }) => {
      const res = await client.api.llm["xiaohongshu-caption"].$post({
        json: { prId },
        query: style !== undefined ? { style: String(style) } : {},
      });

      if (!res.ok) {
        throw new Error(i18n.global.t("errors.generateCaptionFailed"));
      }

      const data = (await res.json()) as {
        caption: string;
        posterStylePrompt: string;
      };
      return data;
    },
  });
};
