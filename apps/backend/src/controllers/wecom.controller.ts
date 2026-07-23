import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { env } from "../lib/env";
import { decryptWeComMessage, extractXmlTagValue, verifySignature } from "../lib/wecom-crypto";
import { createPRFromNaturalLanguage } from "../domains/pr/commands";
import { AUTHENTICATED_REQUIRED_CODE, type CreatorIdentityInput } from "../domains/pr/contracts";
import { ProblemDetailsError } from "../lib/problem-details";
import { WeComService } from "../services/WeComService";

const app = new Hono();
const wecomService = new WeComService();

const wecomQuerySchema = z.object({
  msg_signature: z.string().min(1),
  timestamp: z.string().min(1),
  nonce: z.string().min(1),
});

const wecomVerifySchema = wecomQuerySchema.extend({
  echostr: z.string().min(1),
});

const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const getCryptoConfig = () => {
  const token = env.WECOM_TOKEN;
  const encodingAesKey = env.WECOM_ENCODING_AES_KEY;
  const corpId = env.WECOM_CORP_ID;

  if (!token) {
    throw new Error("Missing env: WECOM_TOKEN");
  }
  if (!encodingAesKey) {
    throw new Error("Missing env: WECOM_ENCODING_AES_KEY");
  }
  if (!corpId) {
    throw new Error("Missing env: WECOM_CORP_ID");
  }

  return { token, encodingAesKey, corpId };
};

const normalizeFrontendUrl = (raw: string) => {
  const trimmed = raw.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, "");
};

export const buildWeComPRShareUrl = (frontendUrl: string, id: number): string =>
  `${normalizeFrontendUrl(frontendUrl)}/pr/${id}`;

const getShanghaiWeekdayLabel = (date: Date): string => {
  return new Intl.DateTimeFormat("zh-CN", {
    weekday: "short",
    timeZone: "Asia/Shanghai",
  }).format(date);
};

const WECOM_AUTHENTICATED_REQUIRED_REPLY =
  "当前企业微信账号未绑定已登录用户，无法创建；请先完成登录绑定后再试。";

export const wecomRoute = app
  .get("/message", zValidator("query", wecomVerifySchema), async (c) => {
    const { msg_signature, timestamp, nonce, echostr } = c.req.valid("query");
    const decodedSignature = safeDecode(msg_signature);
    const decodedTimestamp = safeDecode(timestamp);
    const decodedNonce = safeDecode(nonce);
    const decodedEchostr = safeDecode(echostr);
    const { token, encodingAesKey, corpId } = getCryptoConfig();

    const valid = verifySignature({
      token,
      timestamp: decodedTimestamp,
      nonce: decodedNonce,
      encrypted: decodedEchostr,
      signature: decodedSignature,
    });

    if (!valid) {
      return c.text("Invalid signature", 400);
    }

    try {
      const { xml } = decryptWeComMessage(encodingAesKey, corpId, decodedEchostr);
      return c.text(xml);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Decrypt failed";
      return c.text(message, 400);
    }
  })
  .post("/message", zValidator("query", wecomQuerySchema), async (c) => {
    const { msg_signature, timestamp, nonce } = c.req.valid("query");
    const decodedSignature = safeDecode(msg_signature);
    const decodedTimestamp = safeDecode(timestamp);
    const decodedNonce = safeDecode(nonce);
    const { token, encodingAesKey, corpId } = getCryptoConfig();
    const body = await c.req.text();
    const encryptedRaw = extractXmlTagValue(body, "Encrypt");
    const encrypted = encryptedRaw ? safeDecode(encryptedRaw) : null;

    if (!encrypted) {
      return c.text("Missing Encrypt", 400);
    }

    const valid = verifySignature({
      token,
      timestamp: decodedTimestamp,
      nonce: decodedNonce,
      encrypted,
      signature: decodedSignature,
    });

    if (!valid) {
      return c.text("Invalid signature", 400);
    }

    const task = (async () => {
      let xml: string;
      try {
        ({ xml } = decryptWeComMessage(encodingAesKey, corpId, encrypted));
      } catch {
        return;
      }
      const msgType = extractXmlTagValue(xml, "MsgType")?.trim();
      if (msgType !== "text") {
        return;
      }

      const content = extractXmlTagValue(xml, "Content");
      const fromUser = extractXmlTagValue(xml, "FromUserName")?.trim();
      const createTime = extractXmlTagValue(xml, "CreateTime")?.trim();

      if (!content || !fromUser || !createTime) {
        return;
      }

      const trimmedContent = content.trim();
      if (!trimmedContent) {
        return;
      }

      const timestampSeconds = Number(createTime);
      if (!Number.isFinite(timestampSeconds)) {
        return;
      }

      const nowIso = new Date(timestampSeconds * 1000).toISOString();
      const nowWeekday = getShanghaiWeekdayLabel(new Date(timestampSeconds * 1000));
      const creatorIdentity: CreatorIdentityInput = {
        authenticatedUserId: null,
        anonymousUserId: null,
        oauthOpenId: null,
      };

      let id: number;
      try {
        ({ id } = await createPRFromNaturalLanguage(
          trimmedContent,
          nowIso,
          nowWeekday,
          creatorIdentity,
        ));
      } catch (error) {
        if (error instanceof ProblemDetailsError && error.code === AUTHENTICATED_REQUIRED_CODE) {
          await wecomService.sendTextMessage({
            toUser: fromUser,
            content: WECOM_AUTHENTICATED_REQUIRED_REPLY,
          });
          return;
        }
        throw error;
      }

      const frontendUrl = env.FRONTEND_URL;
      if (!frontendUrl) {
        throw new Error("Missing env: FRONTEND_URL");
      }

      const shareUrl = buildWeComPRShareUrl(frontendUrl, id);
      const reply = `搭子请求草稿已创建：${shareUrl}\n打开链接并完成微信登录后即可发布。`;

      await wecomService.sendTextMessage({
        toUser: fromUser,
        content: reply,
      });
    })();

    void task.catch(() => undefined);

    return c.text("");
  });
