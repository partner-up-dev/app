import crypto from "crypto";

type WeComSignatureParams = {
  token: string;
  timestamp: string;
  nonce: string;
  encrypted: string;
  signature: string;
};

type WeComDecryptedPayload = {
  xml: string;
  corpId: string;
};

type WeComPaddingDiagnostics = {
  bufferLength: number;
  paddingByte: number | null;
  paddingValid: boolean | null;
};

const unpadPkcs7 = (buffer: Buffer) => {
  if (buffer.length === 0) {
    throw new Error("WeCom message empty");
  }

  const paddingByte = buffer[buffer.length - 1];
  if (paddingByte < 1 || paddingByte > 32) {
    throw new Error("WeCom padding invalid");
  }

  if (paddingByte > buffer.length) {
    throw new Error("WeCom padding invalid");
  }

  const start = buffer.length - paddingByte;
  for (let i = start; i < buffer.length; i += 1) {
    if (buffer[i] !== paddingByte) {
      throw new Error("WeCom padding invalid");
    }
  }

  return buffer.subarray(0, start);
};

const normalizeBase64 = (value: string) => {
  const trimmed = value.trim();
  // Some gateways may convert '+' to spaces; normalize before stripping whitespace.
  const normalizedSpaces = trimmed.replace(/\s/g, (char) => (char === " " ? "+" : ""));
  const compact = normalizedSpaces.replace(/\s+/g, "");
  const padNeeded = compact.length % 4 === 0 ? 0 : 4 - (compact.length % 4);
  return padNeeded === 0 ? compact : `${compact}${"=".repeat(padNeeded)}`;
};

const getAesKey = (encodingAesKey: string) => {
  const normalized = normalizeBase64(encodingAesKey);
  const key = Buffer.from(normalized, "base64");
  if (key.length !== 32) {
    throw new Error("Invalid WECOM_ENCODING_AES_KEY");
  }
  return key;
};

export const verifySignature = ({
  token,
  timestamp,
  nonce,
  encrypted,
  signature,
}: WeComSignatureParams) => {
  const parts = [token, timestamp, nonce, encrypted].sort();
  const digest = crypto.createHash("sha1").update(parts.join(""), "utf8").digest("hex");
  return digest === signature;
};

export const decryptWeComMessage = (
  encodingAesKey: string,
  corpId: string,
  encrypted: string,
): WeComDecryptedPayload => {
  const aesKey = getAesKey(encodingAesKey);
  const iv = aesKey.subarray(0, 16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, iv);
  decipher.setAutoPadding(false);

  const normalizedEncrypted = normalizeBase64(encrypted);
  const encryptedBuffer = Buffer.from(normalizedEncrypted, "base64");
  const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);

  const unpadded = unpadPkcs7(decrypted);

  if (unpadded.length < 20) {
    throw new Error("WeCom message too short");
  }

  const messageLength = unpadded.readUInt32BE(16);
  const xmlStart = 20;
  const xmlEnd = xmlStart + messageLength;

  if (xmlEnd > unpadded.length) {
    throw new Error("WeCom message length invalid");
  }

  const xml = unpadded.subarray(xmlStart, xmlEnd).toString("utf8");
  const receivedCorpId = unpadded.subarray(xmlEnd).toString("utf8");

  if (receivedCorpId !== corpId) {
    throw new Error("WeCom corpId mismatch");
  }

  return { xml, corpId: receivedCorpId };
};

export const diagnoseWeComCiphertext = (
  encodingAesKey: string,
  encrypted: string,
): WeComPaddingDiagnostics => {
  const aesKey = getAesKey(encodingAesKey);
  const iv = aesKey.subarray(0, 16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, iv);
  decipher.setAutoPadding(false);

  const normalizedEncrypted = normalizeBase64(encrypted);
  const encryptedBuffer = Buffer.from(normalizedEncrypted, "base64");
  const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);

  if (decrypted.length === 0) {
    return { bufferLength: 0, paddingByte: null, paddingValid: null };
  }

  const paddingByte = decrypted[decrypted.length - 1];
  if (paddingByte < 1 || paddingByte > 32) {
    return { bufferLength: decrypted.length, paddingByte, paddingValid: false };
  }

  if (paddingByte > decrypted.length) {
    return { bufferLength: decrypted.length, paddingByte, paddingValid: false };
  }

  const start = decrypted.length - paddingByte;
  for (let i = start; i < decrypted.length; i += 1) {
    if (decrypted[i] !== paddingByte) {
      return {
        bufferLength: decrypted.length,
        paddingByte,
        paddingValid: false,
      };
    }
  }

  return { bufferLength: decrypted.length, paddingByte, paddingValid: true };
};

export const extractXmlTagValue = (xml: string, tag: string) => {
  const pattern = new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`);
  const match = xml.match(pattern);
  if (!match) {
    return null;
  }
  return match[1] ?? null;
};
