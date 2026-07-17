import { z } from "zod";
import { env } from "../lib/env";
import { proxyFetch } from "../lib/proxy-fetch";

type TokenCache = {
  token: string;
  expiresAtMs: number;
};

export type WeChatOfficialAccountFollowerPage = {
  openIds: string[];
  nextOpenId: string | null;
  count: number;
};

const CLOCK_SKEW_MS = 60_000;

const tokenResponseSchema = z.object({
  access_token: z.string().optional(),
  expires_in: z.number().int().positive().optional(),
  errcode: z.number().int().optional(),
  errmsg: z.string().optional(),
});

const followerListResponseSchema = z.object({
  total: z.number().int().nonnegative().optional(),
  count: z.number().int().nonnegative().optional(),
  data: z
    .object({
      openid: z.array(z.string()),
    })
    .optional(),
  next_openid: z.string().optional(),
  errcode: z.number().int().optional(),
  errmsg: z.string().optional(),
});

export class WeChatOfficialAccountFollowerError extends Error {
  constructor(
    message: string,
    public readonly errorCode: string | null,
  ) {
    super(message);
    this.name = "WeChatOfficialAccountFollowerError";
  }
}

let accessTokenCache: TokenCache | null = null;

export class WeChatOfficialAccountFollowerService {
  isConfigured(): boolean {
    return Boolean(env.WECHAT_OFFICIAL_ACCOUNT_APP_ID && env.WECHAT_OFFICIAL_ACCOUNT_APP_SECRET);
  }

  async fetchFollowerOpenIdPage(
    nextOpenId: string | null,
  ): Promise<WeChatOfficialAccountFollowerPage> {
    const accessToken = await this.getAccessToken();
    const url = new URL("https://api.weixin.qq.com/cgi-bin/user/get");
    url.searchParams.set("access_token", accessToken);
    if (nextOpenId) {
      url.searchParams.set("next_openid", nextOpenId);
    }

    const response = await proxyFetch(url);
    if (!response.ok) {
      throw new Error(
        `WeChat follower list request failed: ${response.status} ${response.statusText}`,
      );
    }

    const payload = followerListResponseSchema.parse(await response.json());
    if (payload.errcode !== undefined && payload.errcode !== 0) {
      throw new WeChatOfficialAccountFollowerError(
        `WeChat follower list error: ${payload.errmsg ?? "unknown"}`,
        String(payload.errcode),
      );
    }

    const openIds = payload.data?.openid ?? [];
    const nextCursor = payload.next_openid?.trim();
    return {
      openIds,
      nextOpenId: nextCursor && nextCursor.length > 0 ? nextCursor : null,
      count: payload.count ?? openIds.length,
    };
  }

  private async getAccessToken(): Promise<string> {
    if (accessTokenCache && accessTokenCache.expiresAtMs - CLOCK_SKEW_MS > Date.now()) {
      return accessTokenCache.token;
    }

    const appId = env.WECHAT_OFFICIAL_ACCOUNT_APP_ID;
    const appSecret = env.WECHAT_OFFICIAL_ACCOUNT_APP_SECRET;
    if (!appId) {
      throw new Error("Missing env: WECHAT_OFFICIAL_ACCOUNT_APP_ID");
    }
    if (!appSecret) {
      throw new Error("Missing env: WECHAT_OFFICIAL_ACCOUNT_APP_SECRET");
    }

    const url = new URL("https://api.weixin.qq.com/cgi-bin/token");
    url.searchParams.set("grant_type", "client_credential");
    url.searchParams.set("appid", appId);
    url.searchParams.set("secret", appSecret);

    const response = await proxyFetch(url);
    if (!response.ok) {
      throw new Error(
        `WeChat access_token request failed: ${response.status} ${response.statusText}`,
      );
    }

    const payload = tokenResponseSchema.parse(await response.json());
    if (payload.errcode !== undefined && payload.errcode !== 0) {
      throw new WeChatOfficialAccountFollowerError(
        `WeChat access_token error: ${payload.errmsg ?? "unknown"}`,
        String(payload.errcode),
      );
    }
    if (!payload.access_token || !payload.expires_in) {
      throw new WeChatOfficialAccountFollowerError(
        `WeChat access_token invalid: ${payload.errmsg ?? "unknown"}`,
        payload.errcode === undefined ? null : String(payload.errcode),
      );
    }

    accessTokenCache = {
      token: payload.access_token,
      expiresAtMs: Date.now() + payload.expires_in * 1000,
    };
    return payload.access_token;
  }
}
