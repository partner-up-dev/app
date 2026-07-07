import { useWeChatShare } from "@/shared/wechat/useWeChatShare";
import { i18n } from "@/locales/i18n";

type WeChatShareCardInput = {
  title?: string | null;
  desc?: string | null;
  link?: string | null;
  imgUrl?: string | null;
  signatureUrl?: string | null;
  routeSessionId?: string | null;
  entityKey?: string | null;
  revision?: string | null;
  phase?: "FALLBACK" | "BASE" | "ENRICHED" | null;
};

const normalizeText = (raw: string | null | undefined): string =>
  (raw ?? "").replace(/\s+/g, " ").trim();

const resolveDefaultLink = (): string => {
  if (typeof window === "undefined") return "";
  return window.location.href;
};

const resolveDefaultImageUrl = (): string => {
  if (typeof window === "undefined") return "";
  return new URL("/share-logo.png", window.location.origin).toString();
};

export const useWeChatShareCard = () => {
  const {
    initWeChatSdk,
    initError,
    replayWeChatShareCard,
    setWeChatShareCard,
  } = useWeChatShare();

  const updateWeChatShareCard = async (
    input: WeChatShareCardInput,
  ): Promise<void> => {
    await setWeChatShareCard({
      title:
        normalizeText(input.title) ||
        i18n.global.t("share.wechat.defaultShareTitle"),
      desc: normalizeText(input.desc) || i18n.global.t("home.subtitle"),
      link: normalizeText(input.link) || resolveDefaultLink(),
      imgUrl: normalizeText(input.imgUrl) || resolveDefaultImageUrl(),
      signatureUrl: normalizeText(input.signatureUrl) || resolveDefaultLink(),
      routeSessionId: normalizeText(input.routeSessionId) || undefined,
      entityKey: normalizeText(input.entityKey) || undefined,
      revision: normalizeText(input.revision) || undefined,
      phase: input.phase ?? undefined,
    });
  };

  return {
    initWeChatSdk,
    initError,
    replayWeChatShareCard,
    updateWeChatShareCard,
  };
};
