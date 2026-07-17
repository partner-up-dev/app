import { z } from "zod";
import { env } from "../lib/env";
import { proxyFetch } from "../lib/proxy-fetch";

type WeComAppConfig = {
  corpId: string;
  appSecret: string;
  agentId: number;
};

type SendTextMessageParams = {
  toUser: string;
  content: string;
};

type TokenCache = {
  token: string;
  expiresAt: number;
};

const tokenResponseSchema = z.object({
  errcode: z.number(),
  errmsg: z.string().optional(),
  access_token: z.string().optional(),
  expires_in: z.number().optional(),
});

const sendMessageResponseSchema = z.object({
  errcode: z.number(),
  errmsg: z.string().optional(),
});

let tokenCache: TokenCache | null = null;

export class WeComService {
  private getAppConfig(): WeComAppConfig {
    const corpId = env.WECOM_CORP_ID;
    const appSecret = env.WECOM_APP_SECRET;
    const agentId = env.WECOM_APP_AGENT_ID;

    if (!corpId) {
      throw new Error("Missing env: WECOM_CORP_ID");
    }
    if (!appSecret) {
      throw new Error("Missing env: WECOM_APP_SECRET");
    }
    if (!agentId) {
      throw new Error("Missing env: WECOM_APP_AGENT_ID");
    }

    return { corpId, appSecret, agentId };
  }

  private async getAppAccessToken() {
    if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
      return tokenCache.token;
    }

    const { corpId, appSecret } = this.getAppConfig();
    const url = new URL("https://qyapi.weixin.qq.com/cgi-bin/gettoken");
    url.searchParams.set("corpid", corpId);
    url.searchParams.set("corpsecret", appSecret);

    const res = await proxyFetch(url);
    if (!res.ok) {
      throw new Error(`WeCom gettoken failed: ${res.status} ${res.statusText}`);
    }

    const json = tokenResponseSchema.parse(await res.json());
    if (json.errcode !== 0 || !json.access_token || !json.expires_in) {
      throw new Error(`WeCom gettoken error: ${json.errcode} ${json.errmsg ?? "unknown"}`);
    }

    tokenCache = {
      token: json.access_token,
      expiresAt: Date.now() + json.expires_in * 1000,
    };

    return tokenCache.token;
  }

  async sendTextMessage({ toUser, content }: SendTextMessageParams) {
    const { agentId } = this.getAppConfig();
    const accessToken = await this.getAppAccessToken();
    const url = new URL("https://qyapi.weixin.qq.com/cgi-bin/message/send");
    url.searchParams.set("access_token", accessToken);

    const payload = {
      touser: toUser,
      msgtype: "text",
      agentid: agentId,
      text: { content },
    };

    const res = await proxyFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`WeCom message send failed: ${res.status} ${res.statusText}`);
    }

    const json = sendMessageResponseSchema.parse(await res.json());
    if (json.errcode !== 0) {
      throw new Error(`WeCom message send error: ${json.errcode} ${json.errmsg ?? "unknown"}`);
    }
  }
}
