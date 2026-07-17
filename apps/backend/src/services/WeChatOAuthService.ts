import { z } from "zod";
import type { UserSex } from "../entities/user";
import { env } from "../lib/env";
import { proxyFetch } from "../lib/proxy-fetch";

const weChatOauthAccessTokenResponseSchema = z.object({
  access_token: z.string().optional(),
  expires_in: z.coerce.number().int().positive().optional(),
  refresh_token: z.string().optional(),
  openid: z.string().optional(),
  scope: z.string().optional(),
  unionid: z.string().optional(),
  errcode: z.coerce.number().int().optional(),
  errmsg: z.string().optional(),
});

const weChatOauthUserInfoResponseSchema = z.object({
  openid: z.string().optional(),
  nickname: z.string().optional(),
  sex: z.coerce.number().int().optional(),
  headimgurl: z.string().optional(),
  unionid: z.string().optional(),
  errcode: z.coerce.number().int().optional(),
  errmsg: z.string().optional(),
});

export type WeChatOAuthLoginSession = {
  openId: string;
  oauthAccessToken: string;
  scope: string | null;
};

export type WeChatOAuthUserProfile = {
  nickname: string | null;
  sex: UserSex | null;
  avatar: string | null;
};

const normalizeUserSex = (rawSex: number | undefined): UserSex | null => {
  if (rawSex === 0 || rawSex === 1 || rawSex === 2) {
    return rawSex;
  }
  return null;
};

const isUserInfoScopeGranted = (scope: string | null): boolean => {
  if (!scope) return false;
  return scope
    .split(",")
    .map((value) => value.trim())
    .includes("snsapi_userinfo");
};

type OAuthConfig = {
  appId: string;
  appSecret: string;
  sessionSecret: string;
};

export class WeChatOAuthService {
  isConfigured(): boolean {
    return Boolean(
      env.WECHAT_OFFICIAL_ACCOUNT_APP_ID &&
      env.WECHAT_OFFICIAL_ACCOUNT_APP_SECRET &&
      env.WECHAT_AUTH_SESSION_SECRET,
    );
  }

  private getConfig(): OAuthConfig {
    const appId = env.WECHAT_OFFICIAL_ACCOUNT_APP_ID;
    const appSecret = env.WECHAT_OFFICIAL_ACCOUNT_APP_SECRET;
    const sessionSecret = env.WECHAT_AUTH_SESSION_SECRET;

    if (!appId) {
      throw new Error("Missing env: WECHAT_OFFICIAL_ACCOUNT_APP_ID");
    }
    if (!appSecret) {
      throw new Error("Missing env: WECHAT_OFFICIAL_ACCOUNT_APP_SECRET");
    }
    if (!sessionSecret) {
      throw new Error("Missing env: WECHAT_AUTH_SESSION_SECRET");
    }

    return { appId, appSecret, sessionSecret };
  }

  getSessionSecret(): string {
    return this.getConfig().sessionSecret;
  }

  createAuthorizeUrl(callbackUrl: string, state: string): string {
    const { appId } = this.getConfig();

    const authorizeUrl = new URL("https://open.weixin.qq.com/connect/oauth2/authorize");
    authorizeUrl.searchParams.set("appid", appId);
    authorizeUrl.searchParams.set("redirect_uri", callbackUrl);
    authorizeUrl.searchParams.set("response_type", "code");
    // Proactive auth is intentionally limited to PR detail and relies on
    // WeChat-native snsapi_userinfo handling for non-user-initiated redirects.
    // Keep forcePopup unset unless product explicitly wants forced consent UX.
    authorizeUrl.searchParams.set("scope", "snsapi_userinfo");
    authorizeUrl.searchParams.set("state", state);

    return `${authorizeUrl.toString()}#wechat_redirect`;
  }

  async exchangeCodeForSession(code: string): Promise<WeChatOAuthLoginSession> {
    const { appId, appSecret } = this.getConfig();

    const tokenUrl = new URL("https://api.weixin.qq.com/sns/oauth2/access_token");
    tokenUrl.searchParams.set("appid", appId);
    tokenUrl.searchParams.set("secret", appSecret);
    tokenUrl.searchParams.set("code", code);
    tokenUrl.searchParams.set("grant_type", "authorization_code");

    const response = await proxyFetch(tokenUrl);
    if (!response.ok) {
      throw new Error(
        `WeChat oauth2/access_token request failed: ${response.status} ${response.statusText}`,
      );
    }

    const payload = weChatOauthAccessTokenResponseSchema.parse(await response.json());

    if (!payload.openid || !payload.access_token) {
      const message = payload.errmsg ?? "Unknown error";
      throw new Error(
        `WeChat oauth2/access_token response invalid: errcode=${payload.errcode ?? "?"} errmsg=${message}`,
      );
    }

    return {
      openId: payload.openid,
      oauthAccessToken: payload.access_token,
      scope: payload.scope ?? null,
    };
  }

  async exchangeCodeForOpenId(code: string): Promise<string> {
    const session = await this.exchangeCodeForSession(code);
    return session.openId;
  }

  async fetchUserInfo(
    oauthAccessToken: string,
    openId: string,
    scope: string | null,
  ): Promise<WeChatOAuthUserProfile> {
    if (!isUserInfoScopeGranted(scope)) {
      throw new Error(`WeChat OAuth scope missing snsapi_userinfo: scope=${scope ?? "null"}`);
    }

    const userInfoUrl = new URL("https://api.weixin.qq.com/sns/userinfo");
    userInfoUrl.searchParams.set("access_token", oauthAccessToken);
    userInfoUrl.searchParams.set("openid", openId);
    userInfoUrl.searchParams.set("lang", "zh_CN");

    const response = await proxyFetch(userInfoUrl);
    if (!response.ok) {
      throw new Error(
        `WeChat sns/userinfo request failed: ${response.status} ${response.statusText}`,
      );
    }

    const payload = weChatOauthUserInfoResponseSchema.parse(await response.json());
    if (!payload.openid) {
      const message = payload.errmsg ?? "Unknown error";
      throw new Error(
        `WeChat sns/userinfo response invalid: errcode=${payload.errcode ?? "?"} errmsg=${message}`,
      );
    }

    if (payload.openid !== openId) {
      throw new Error("WeChat sns/userinfo openid mismatch");
    }

    const nickname = payload.nickname?.trim();
    const avatar = payload.headimgurl?.trim();

    return {
      nickname: nickname && nickname.length > 0 ? nickname : null,
      sex: normalizeUserSex(payload.sex),
      avatar: avatar && avatar.length > 0 ? avatar : null,
    };
  }
}
