import { createCipheriv, createSign, createVerify, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";

const authorizationPartsSchema = z.object({
  mchid: z.string().min(1),
  nonce_str: z.string().min(1),
  serial_no: z.string().min(1),
  signature: z.string().min(1),
  timestamp: z.string().regex(/^\d+$/),
});

export type WeChatPayAuthorizationParts = z.infer<typeof authorizationPartsSchema>;

export const createNonce = (): string => randomUUID().replaceAll("-", "");

export const createAesNonce = (): string => randomBytes(9).toString("base64url").slice(0, 12);

export const unixTimestamp = (): string => String(Math.floor(Date.now() / 1000));

const joinByLineFeed = (...pieces: readonly string[]): string => [...pieces, ""].join("\n");

export const buildRequestSignatureMessage = (input: {
  method: string;
  pathWithQuery: string;
  timestamp: string;
  nonce: string;
  bodyText: string;
}): string =>
  joinByLineFeed(
    input.method.toUpperCase(),
    input.pathWithQuery,
    input.timestamp,
    input.nonce,
    input.bodyText,
  );

export const buildResponseSignatureMessage = (input: {
  timestamp: string;
  nonce: string;
  bodyText: string;
}): string => joinByLineFeed(input.timestamp, input.nonce, input.bodyText);

export const signRsaSha256 = (input: { message: string; privateKeyPem: string }): string =>
  createSign("sha256WithRSAEncryption").update(input.message).sign(input.privateKeyPem, "base64");

export const verifyRsaSha256 = (input: {
  message: string;
  signature: string;
  publicKeyPem: string;
}): boolean =>
  createVerify("sha256WithRSAEncryption")
    .update(input.message)
    .verify(input.publicKeyPem, input.signature, "base64");

export const parseAuthorizationHeader = (value: string | null): WeChatPayAuthorizationParts => {
  if (!value?.startsWith("WECHATPAY2-SHA256-RSA2048 ")) {
    throw new Error("Missing WECHATPAY2-SHA256-RSA2048 Authorization header");
  }

  const pairs: Record<string, string> = {};
  const pattern = /([a-z_]+)="([^"]*)"/g;
  for (const match of value.slice("WECHATPAY2-SHA256-RSA2048 ".length).matchAll(pattern)) {
    pairs[match[1] ?? ""] = match[2] ?? "";
  }

  return authorizationPartsSchema.parse(pairs);
};

export const encryptAes256GcmBase64 = (input: {
  plaintext: string;
  key: string;
  nonce: string;
  associatedData: string;
}): string => {
  const cipher = createCipheriv("aes-256-gcm", input.key, input.nonce).setAAD(
    Buffer.from(input.associatedData),
  );
  return Buffer.concat([
    cipher.update(input.plaintext, "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString("base64");
};

export const buildSignedHeaders = (input: {
  bodyText: string;
  platformSerialNo: string;
  platformPrivateKeyPem: string;
}): Headers => {
  const timestamp = unixTimestamp();
  const nonce = createNonce();
  const signature = signRsaSha256({
    privateKeyPem: input.platformPrivateKeyPem,
    message: buildResponseSignatureMessage({
      bodyText: input.bodyText,
      nonce,
      timestamp,
    }),
  });

  const headers = new Headers();
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Wechatpay-Timestamp", timestamp);
  headers.set("Wechatpay-Nonce", nonce);
  headers.set("Wechatpay-Serial", input.platformSerialNo);
  headers.set("Wechatpay-Signature", signature);
  return headers;
};
