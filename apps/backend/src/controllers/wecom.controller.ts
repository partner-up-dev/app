import { zValidator } from "@hono/zod-validator";
import { createHash } from "crypto";
import { Hono } from "hono";
import { z } from "zod";
import { env } from "../lib/env";
import {
  decryptWeComMessage,
  diagnoseWeComCiphertext,
  extractXmlTagValue,
  verifySignature,
} from "../lib/wecom-crypto";
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

const maskValue = (value: string) => {
  if (value.length <= 8) {
    return "***";
  }
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
};

const hashValue = (value: string) => createHash("sha1").update(value, "utf8").digest("hex");

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

const getEncryptDiagnostics = (value: string) => {
  let spaceCount = 0;
  let plusCount = 0;
  let nonBase64Count = 0;

  for (const ch of value) {
    if (ch === " ") {
      spaceCount += 1;
      continue;
    }
    if (ch === "+") {
      plusCount += 1;
    }
    if (!/[A-Za-z0-9+/=]/.test(ch)) {
      nonBase64Count += 1;
    }
  }

  return {
    length: value.length,
    spaceCount,
    plusCount,
    nonBase64Count,
  };
};

const getCipherDiagnostics = (value: string) => {
  const normalized = value.trim();
  const buffer = Buffer.from(normalized, "base64");
  const roundtrip = buffer.toString("base64");
  const normalizedRoundtrip = normalized.replace(/=+$/, "");

  return {
    bufferLength: buffer.length,
    bufferLengthMod16: buffer.length % 16,
    base64LengthMod4: normalized.length % 4,
    roundtripMatches: roundtrip.replace(/=+$/, "") === normalizedRoundtrip,
  };
};

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
      console.warn("WeCom URL verify signature invalid", {
        msgSignature: maskValue(decodedSignature),
        timestamp: decodedTimestamp,
        nonce: decodedNonce,
        echostrLength: decodedEchostr.length,
        encodingAesKeyLength: encodingAesKey.length,
      });
      return c.text("Invalid signature", 400);
    }

    try {
      const { xml } = decryptWeComMessage(encodingAesKey, corpId, decodedEchostr);
      return c.text(xml);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Decrypt failed";
      console.warn("WeCom URL verify decrypt failed", {
        message,
        echostrLength: decodedEchostr.length,
        encodingAesKeyLength: encodingAesKey.length,
        corpIdLength: corpId.length,
      });
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

    console.info("WeCom raw body diagnostics", {
      bodyLength: body.length,
      bodyHash: hashValue(body),
      encryptRawLength: encryptedRaw?.length ?? 0,
      encryptRawHash: encryptedRaw ? hashValue(encryptedRaw) : undefined,
    });

    if (!encrypted) {
      console.warn("WeCom message missing Encrypt", {
        bodyLength: body.length,
        encodingAesKeyLength: encodingAesKey.length,
        corpIdLength: corpId.length,
      });
      return c.text("Missing Encrypt", 400);
    }

    const encryptDiagnostics = getEncryptDiagnostics(encrypted);
    if (encryptDiagnostics.spaceCount > 0 || encryptDiagnostics.nonBase64Count > 0) {
      console.warn("WeCom Encrypt diagnostics", encryptDiagnostics);
    }

    console.info("WeCom decrypt debug", {
      msgSignature: maskValue(decodedSignature),
      tokenHash: hashValue(token),
      encodingAesKeyMask: maskValue(encodingAesKey),
      encodingAesKeyHash: hashValue(encodingAesKey),
      corpIdMask: maskValue(corpId),
      corpIdLength: corpId.length,
      encryptLength: encrypted.length,
      encryptHash: hashValue(encrypted),
    });
    console.info("WeCom cipher diagnostics", getCipherDiagnostics(encrypted));

    const valid = verifySignature({
      token,
      timestamp: decodedTimestamp,
      nonce: decodedNonce,
      encrypted,
      signature: decodedSignature,
    });

    if (!valid) {
      console.warn("WeCom message signature invalid", {
        msgSignature: maskValue(decodedSignature),
        timestamp: decodedTimestamp,
        nonce: decodedNonce,
        encryptLength: encrypted.length,
        encodingAesKeyLength: encodingAesKey.length,
      });
      return c.text("Invalid signature", 400);
    }

    const task = (async () => {
      let xml: string;
      try {
        ({ xml } = decryptWeComMessage(encodingAesKey, corpId, encrypted));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Decrypt failed";
        try {
          const paddingDiagnostics = diagnoseWeComCiphertext(encodingAesKey, encrypted);
          console.warn("WeCom padding diagnostics", paddingDiagnostics);
        } catch (diagnoseError) {
          const diagMessage =
            diagnoseError instanceof Error ? diagnoseError.message : "Padding diagnose failed";
          console.warn("WeCom padding diagnostics failed", {
            message: diagMessage,
          });
        }
        console.warn("WeCom message decrypt failed", {
          message,
          encryptLength: encrypted.length,
          encodingAesKeyLength: encodingAesKey.length,
          corpIdLength: corpId.length,
        });
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

    task.catch((error) => {
      console.error("WeCom async reply failed", error);
    });

    return c.text("");
  });
