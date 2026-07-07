import type { PRId } from "@partner-up-dev/backend";
import type { PRFormFields } from "@/domains/pr/model/types";
import type { ShareSpmRouteKey } from "@/shared/url/spm";

export type XhsPosterSnapshot = {
  caption: string;
  posterStylePrompt: string;
  posterUrl: string;
  createdAt: string;
};

export type WechatThumbnailSnapshot = {
  style: number;
  posterUrl: string;
  createdAt: string;
};

export type CanonicalShareMetadata = {
  title: string;
  description: string;
  canonicalPath: string;
  defaultImagePath: string;
  revision: string;
};

export type PRShareData = PRFormFields & {
  rawText?: string | null;
  canonicalShare: CanonicalShareMetadata;
  xiaohongshuPoster?: XhsPosterSnapshot | null;
  wechatThumbnail?: WechatThumbnailSnapshot | null;
};

export type PRShareProps = {
  shareUrl: string;
  spmRouteKey: ShareSpmRouteKey;
  prId: PRId;
  prData: PRShareData;
};

export type RouteSharePhase = "FALLBACK" | "BASE" | "ENRICHED";

export type RouteShareDescriptor = {
  routeSessionId: string;
  entityKey: string | null;
  revision: string;
  phase: RouteSharePhase;
  signatureUrl: string;
  targetUrl: string;
  title: string;
  desc: string;
  imgUrl: string;
};
