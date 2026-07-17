import { useQuery } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { i18n } from "@/locales/i18n";

export const PUBLIC_CONFIG_KEYS = {
  authorWechatQrCode: "author_wechat_qr_code",
  homePageWechatQrCode: "home_page_wechat_qr_code",
  orderingReservationQrCode: "ordering_reservation_qr_code",
  wecomServiceQrCode: "wecom_service_qr_code",
  wecomSupportLinkWechatIn: "wecom_support_link_wechat_in",
  wecomSupportLinkWechatOut: "wecom_support_link_wechat_out",
  wechatOfficialAccountQrCode: "wechat_official_account_qr_code",
} as const;

export type PublicConfigKey = (typeof PUBLIC_CONFIG_KEYS)[keyof typeof PUBLIC_CONFIG_KEYS];

export const usePublicConfig = (key: PublicConfigKey) => {
  return useQuery({
    queryKey: queryKeys.config.public(key),
    queryFn: async () => {
      const res = await client.api.config.public[":key"].$get({
        param: { key },
      });

      if (!res.ok) {
        throw new Error(i18n.global.t("errors.fetchPublicConfigFailed"));
      }

      return await res.json();
    },
  });
};
