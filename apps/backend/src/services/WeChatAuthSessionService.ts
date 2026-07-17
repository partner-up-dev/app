import crypto from "crypto";
import { env } from "../lib/env";

const TOKEN_VERSION = 1 as const;

type SignedPayload<TPayload extends object> = TPayload & {
  version: typeof TOKEN_VERSION;
};

export type WeChatSessionPayload = {
  openId: string;
  unionId: string | null;
  issuedAt: number;
  expiresAt: number;
};

export type WeChatLoginStatePayload = {
  state: string;
  returnTo: string;
  createdAt: number;
};

const encodeBase64Url = (raw: string): string => Buffer.from(raw, "utf8").toString("base64url");

const decodeBase64Url = (raw: string): string => Buffer.from(raw, "base64url").toString("utf8");

const parseJsonSafely = <TPayload>(raw: string): TPayload | null => {
  try {
    return JSON.parse(raw) as TPayload;
  } catch {
    return null;
  }
};

export class WeChatAuthSessionService {
  private readonly secret = env.WECHAT_AUTH_SESSION_SECRET ?? null;

  isConfigured(): boolean {
    return Boolean(this.secret);
  }

  private getSecret(): string {
    if (!this.secret) {
      throw new Error("Missing env: WECHAT_AUTH_SESSION_SECRET");
    }
    return this.secret;
  }

  private sign(encodedPayload: string): string {
    return crypto.createHmac("sha256", this.getSecret()).update(encodedPayload).digest("base64url");
  }

  private isSignatureValid(provided: string, expected: string): boolean {
    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expected);

    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  }

  private createSignedToken<TPayload extends object>(payload: TPayload): string {
    const wrappedPayload: SignedPayload<TPayload> = {
      ...payload,
      version: TOKEN_VERSION,
    };

    const encodedPayload = encodeBase64Url(JSON.stringify(wrappedPayload));
    const signature = this.sign(encodedPayload);
    return `${encodedPayload}.${signature}`;
  }

  private parseSignedToken<TPayload extends object>(token: string): SignedPayload<TPayload> | null {
    const [encodedPayload, providedSignature] = token.split(".");

    if (!encodedPayload || !providedSignature) {
      return null;
    }

    const expectedSignature = this.sign(encodedPayload);
    if (!this.isSignatureValid(providedSignature, expectedSignature)) {
      return null;
    }

    const decodedPayload = parseJsonSafely<SignedPayload<TPayload>>(
      decodeBase64Url(encodedPayload),
    );

    if (!decodedPayload) {
      return null;
    }

    if (decodedPayload.version !== TOKEN_VERSION) {
      return null;
    }

    return decodedPayload;
  }

  createSessionToken(payload: WeChatSessionPayload): string {
    return this.createSignedToken(payload);
  }

  parseSessionToken(token: string): WeChatSessionPayload | null {
    const parsed = this.parseSignedToken<WeChatSessionPayload>(token);
    if (!parsed) return null;

    if (parsed.expiresAt <= Date.now()) {
      return null;
    }

    return {
      openId: parsed.openId,
      unionId: parsed.unionId,
      issuedAt: parsed.issuedAt,
      expiresAt: parsed.expiresAt,
    };
  }

  createLoginStateToken(payload: WeChatLoginStatePayload): string {
    return this.createSignedToken(payload);
  }

  parseLoginStateToken(token: string): WeChatLoginStatePayload | null {
    const parsed = this.parseSignedToken<WeChatLoginStatePayload>(token);
    if (!parsed) return null;

    return {
      state: parsed.state,
      returnTo: parsed.returnTo,
      createdAt: parsed.createdAt,
    };
  }
}
