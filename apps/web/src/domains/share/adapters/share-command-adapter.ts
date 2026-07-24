import type { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import {
  buildApiError,
  readApiErrorPayload,
  resolveApiErrorMessage,
  type ApiError,
} from "@/shared/api/error";

type ShareApi = typeof client.api.share;
type GenerateWechatDescriptionRoute = ShareApi["wechat-card"]["generate-description"]["$post"];
type CacheWechatThumbnailRoute = ShareApi["wechat-card"]["cache-thumbnail"]["$post"];
type CacheXiaohongshuPosterRoute = ShareApi["xiaohongshu"]["cache-poster"]["$post"];

export type GenerateWechatShareDescriptionInput =
  InferRequestType<GenerateWechatDescriptionRoute>["json"];
export type CacheWechatShareThumbnailInput = InferRequestType<CacheWechatThumbnailRoute>["json"];
export type CacheXiaohongshuSharePosterInput =
  InferRequestType<CacheXiaohongshuPosterRoute>["json"];

type GenerateWechatDescriptionResponse = InferResponseType<GenerateWechatDescriptionRoute, 200>;

export type ShareCommandOutcome<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      error: ApiError;
    };

const toShareCommandError = async (response: Response, fallback: string): Promise<ApiError> => {
  const payload = await readApiErrorPayload(response);
  const error = buildApiError(resolveApiErrorMessage(payload, fallback), payload);
  error.status ??= response.status;
  return error;
};

export const generateWechatShareDescription = async (
  input: GenerateWechatShareDescriptionInput,
): Promise<ShareCommandOutcome<string>> => {
  const response = await client.api.share["wechat-card"]["generate-description"].$post({
    json: {
      prId: input.prId,
    },
  });

  if (!response.ok) {
    return {
      ok: false,
      error: await toShareCommandError(response, "Failed to generate WeChat share description"),
    };
  }

  const result = (await response.json()) as GenerateWechatDescriptionResponse;
  return {
    ok: true,
    value: result.description,
  };
};

export const cacheWechatShareThumbnail = async (
  input: CacheWechatShareThumbnailInput,
): Promise<ShareCommandOutcome<undefined>> => {
  const response = await client.api.share["wechat-card"]["cache-thumbnail"].$post({
    json: {
      prId: input.prId,
      style: input.style,
      posterUrl: input.posterUrl,
    },
  });

  if (!response.ok) {
    return {
      ok: false,
      error: await toShareCommandError(response, "Failed to cache WeChat share thumbnail"),
    };
  }

  return { ok: true, value: undefined };
};

export const cacheXiaohongshuSharePoster = async (
  input: CacheXiaohongshuSharePosterInput,
): Promise<ShareCommandOutcome<undefined>> => {
  const response = await client.api.share.xiaohongshu["cache-poster"].$post({
    json: {
      prId: input.prId,
      caption: input.caption,
      posterStylePrompt: input.posterStylePrompt,
      posterUrl: input.posterUrl,
    },
  });

  if (!response.ok) {
    return {
      ok: false,
      error: await toShareCommandError(response, "Failed to cache Xiaohongshu share poster"),
    };
  }

  return { ok: true, value: undefined };
};
