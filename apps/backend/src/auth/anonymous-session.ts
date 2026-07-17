import { z } from "zod";
import type { Context } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { env } from "../lib/env";

const ANON_SESSION_COOKIE_NAME = "partnerup_anon_session";
const ANON_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

const anonSessionPayloadSchema = z.object({
  userId: z.string().uuid(),
  issuedAtMs: z.number().int().positive(),
  expiresAtMs: z.number().int().positive(),
});

type AnonymousSessionPayload = z.infer<typeof anonSessionPayloadSchema>;

const resolveSessionSecret = (): string => env.AUTH_JWT_SECRET;

const encodePayload = (payload: object): string =>
  Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

const decodePayload = <T>(rawValue: string, schema: z.ZodType<T>): T | null => {
  try {
    const json = Buffer.from(rawValue, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as unknown;
    const result = schema.safeParse(parsed);
    if (!result.success) return null;
    return result.data;
  } catch {
    return null;
  }
};

const resolveCookieBaseOptions = (c: Context) => ({
  httpOnly: true,
  sameSite: "Lax" as const,
  secure: new URL(c.req.url).protocol === "https:",
  path: "/",
});

export const setAnonymousSessionCookie = async (c: Context, userId: string): Promise<void> => {
  const issuedAtMs = Date.now();
  const payload: AnonymousSessionPayload = {
    userId,
    issuedAtMs,
    expiresAtMs: issuedAtMs + ANON_SESSION_TTL_SECONDS * 1000,
  };

  await setSignedCookie(
    c,
    ANON_SESSION_COOKIE_NAME,
    encodePayload(payload),
    resolveSessionSecret(),
    {
      ...resolveCookieBaseOptions(c),
      maxAge: ANON_SESSION_TTL_SECONDS,
    },
  );
};

export const readAnonymousSessionCookie = async (c: Context): Promise<string | null> => {
  const raw = await getSignedCookie(c, resolveSessionSecret(), ANON_SESSION_COOKIE_NAME);
  if (!raw) return null;

  const payload = decodePayload(raw, anonSessionPayloadSchema);
  if (!payload || payload.expiresAtMs <= Date.now()) {
    return null;
  }

  return payload.userId;
};

export const clearAnonymousSessionCookie = (c: Context): void => {
  deleteCookie(c, ANON_SESSION_COOKIE_NAME, resolveCookieBaseOptions(c));
};
