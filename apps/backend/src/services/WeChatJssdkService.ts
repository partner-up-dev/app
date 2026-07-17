import crypto from "crypto";
import { z } from "zod";
import { env } from "../lib/env";
import { proxyFetch } from "../lib/proxy-fetch";

const weChatAccessTokenSchema = z.object({
  access_token: z.string().optional(),
  expires_in: z.number().int().positive().optional(),
  errcode: z.number().int().optional(),
  errmsg: z.string().optional(),
});

const weChatJsApiTicketSchema = z.object({
  ticket: z.string().optional(),
  expires_in: z.number().int().positive().optional(),
  errcode: z.number().int().optional(),
  errmsg: z.string().optional(),
});

type CachedValue<T> = {
  value: T;
  expiresAtMs: number;
};

type AccessToken = {
  token: string;
};

type JsApiTicket = {
  ticket: string;
};

let cachedAccessToken: CachedValue<AccessToken> | null = null;
let cachedJsApiTicket: CachedValue<JsApiTicket> | null = null;

const CLOCK_SKEW_MS = 60_000;

const nowMs = (): number => Date.now();

const isFresh = (cached: CachedValue<unknown> | null): boolean => {
  if (!cached) return false;
  return cached.expiresAtMs - CLOCK_SKEW_MS > nowMs();
};

const createNonceStr = (): string => crypto.randomBytes(16).toString("hex");

const sha1 = (input: string): string => crypto.createHash("sha1").update(input).digest("hex");

const normalizeUrlForSignature = (rawUrl: string): string => {
  const parsed = new URL(rawUrl);
  parsed.hash = "";
  return parsed.toString();
};

export type WeChatJssdkSignature = {
  appId: string;
  timestamp: number;
  nonceStr: string;
  signature: string;
};

export class WeChatJssdkService {
  private getAppId(): string {
    const appId = env.WECHAT_OFFICIAL_ACCOUNT_APP_ID;
    if (!appId) {
      throw new Error("Missing env: WECHAT_OFFICIAL_ACCOUNT_APP_ID");
    }
    return appId;
  }

  private getAppSecret(): string {
    const appSecret = env.WECHAT_OFFICIAL_ACCOUNT_APP_SECRET;
    if (!appSecret) {
      throw new Error("Missing env: WECHAT_OFFICIAL_ACCOUNT_APP_SECRET");
    }
    return appSecret;
  }

  private async fetchAccessToken(): Promise<CachedValue<AccessToken>> {
    const appId = this.getAppId();
    const appSecret = this.getAppSecret();

    const url = new URL("https://api.weixin.qq.com/cgi-bin/token");
    url.searchParams.set("grant_type", "client_credential");
    url.searchParams.set("appid", appId);
    url.searchParams.set("secret", appSecret);

    const res = await proxyFetch(url);
    if (!res.ok) {
      throw new Error(`WeChat access_token request failed: ${res.status} ${res.statusText}`);
    }

    const json = weChatAccessTokenSchema.parse(await res.json());
    if (!json.access_token || !json.expires_in) {
      const msg = json.errmsg ?? "Unknown error";
      throw new Error(
        `WeChat access_token response invalid: errcode=${json.errcode ?? "?"} errmsg=${msg}`,
      );
    }

    return {
      value: { token: json.access_token },
      expiresAtMs: nowMs() + json.expires_in * 1000,
    };
  }

  private async getAccessToken(): Promise<string> {
    if (cachedAccessToken && isFresh(cachedAccessToken)) {
      return cachedAccessToken.value.token;
    }

    cachedAccessToken = await this.fetchAccessToken();
    return cachedAccessToken.value.token;
  }

  private async fetchJsApiTicket(accessToken: string): Promise<CachedValue<JsApiTicket>> {
    const url = new URL("https://api.weixin.qq.com/cgi-bin/ticket/getticket");
    url.searchParams.set("access_token", accessToken);
    url.searchParams.set("type", "jsapi");

    const res = await proxyFetch(url);
    if (!res.ok) {
      throw new Error(`WeChat jsapi_ticket request failed: ${res.status} ${res.statusText}`);
    }

    const json = weChatJsApiTicketSchema.parse(await res.json());
    if (!json.ticket || !json.expires_in) {
      const msg = json.errmsg ?? "Unknown error";
      throw new Error(
        `WeChat jsapi_ticket response invalid: errcode=${json.errcode ?? "?"} errmsg=${msg}`,
      );
    }

    return {
      value: { ticket: json.ticket },
      expiresAtMs: nowMs() + json.expires_in * 1000,
    };
  }

  private async getJsApiTicket(): Promise<string> {
    if (cachedJsApiTicket && isFresh(cachedJsApiTicket)) {
      return cachedJsApiTicket.value.ticket;
    }

    const accessToken = await this.getAccessToken();
    cachedJsApiTicket = await this.fetchJsApiTicket(accessToken);
    return cachedJsApiTicket.value.ticket;
  }

  async createSignature(rawUrl: string): Promise<WeChatJssdkSignature> {
    const appId = this.getAppId();
    const url = normalizeUrlForSignature(rawUrl);
    const jsapiTicket = await this.getJsApiTicket();

    const nonceStr = createNonceStr();
    const timestamp = Math.floor(Date.now() / 1000);

    const string1 =
      `jsapi_ticket=${jsapiTicket}` +
      `&noncestr=${nonceStr}` +
      `&timestamp=${timestamp}` +
      `&url=${url}`;

    const signature = sha1(string1);

    return { appId, timestamp, nonceStr, signature };
  }
}
