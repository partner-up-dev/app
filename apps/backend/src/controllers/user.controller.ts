import { throwHttpProblem } from "../lib/problem-details";
import { promises as fs } from "fs";
import path from "path";
import { Hono, type Context } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware, type AuthEnv } from "../auth/middleware";
import {
  getCurrentUserProfile,
  updateCurrentUserAvatar,
  updateCurrentUserNickname,
  updateCurrentUserPhoneNumber,
} from "../domains/user/use-cases/current-user";
import type { UserId } from "../entities/user";
import { env } from "../lib/env";

const app = new Hono<AuthEnv>();

const defaultAvatarsDir =
  process.platform === "win32" ? path.join(process.cwd(), "avatars") : "/mnt/oss/avatars";
const avatarsDir = env.AVATARS_DIR ?? defaultAvatarsDir;

const updateCurrentUserSchema = z.object({
  nickname: z.string().trim().min(1).max(40),
});

const updateCurrentUserPhoneNumberSchema = z.object({
  phoneNumber: z.string().trim().max(32).nullable(),
});

const avatarParamsSchema = z.object({
  filename: z.string().regex(/^[0-9a-f-]+\.(png|jpg|webp)$/),
});

const mimeTypeByExtension: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
};

const requireAuthenticatedUserId = (c: Context<AuthEnv>): UserId => {
  const auth = c.get("auth");
  if (auth.role === "anonymous" || !auth.userId) {
    return throwHttpProblem({ status: 401, detail: "Authentication required" });
  }

  return auth.userId as UserId;
};

const resolveAvatarUrl = (requestUrl: string, avatar: string | null): string | null => {
  if (!avatar) return null;

  try {
    return new URL(avatar).toString();
  } catch {
    return new URL(avatar, requestUrl).toString();
  }
};

export const userRoute = app
  .get("/avatar/:filename", zValidator("param", avatarParamsSchema), async (c) => {
    const { filename } = c.req.valid("param");
    const filepath = path.join(avatarsDir, filename);

    try {
      await fs.access(filepath);
    } catch {
      return c.json({ error: "Avatar not found" }, 404);
    }

    const buffer = await fs.readFile(filepath);
    const extension = path.extname(filename).toLowerCase();
    const contentType = mimeTypeByExtension[extension] ?? "application/octet-stream";

    return c.body(buffer, 200, {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000",
    });
  })
  .use("*", authMiddleware)
  .get("/me", async (c) => {
    const userId = requireAuthenticatedUserId(c);
    const profile = await getCurrentUserProfile(userId);

    return c.json({
      ...profile,
      avatar: resolveAvatarUrl(c.req.url, profile.avatar),
    });
  })
  .patch("/me", zValidator("json", updateCurrentUserSchema), async (c) => {
    const userId = requireAuthenticatedUserId(c);
    const { nickname } = c.req.valid("json");
    const profile = await updateCurrentUserNickname(userId, nickname);

    return c.json({
      ...profile,
      avatar: resolveAvatarUrl(c.req.url, profile.avatar),
    });
  })
  .post("/me/avatar", async (c) => {
    const userId = requireAuthenticatedUserId(c);
    const formData = await c.req.formData();
    const avatar = formData.get("avatar");

    if (!(avatar instanceof File)) {
      return c.json({ error: "Avatar file is required" }, 400);
    }

    const profile = await updateCurrentUserAvatar(userId, avatar);

    return c.json({
      ...profile,
      avatar: resolveAvatarUrl(c.req.url, profile.avatar),
    });
  })
  .put("/me/phone-number", zValidator("json", updateCurrentUserPhoneNumberSchema), async (c) => {
    const userId = requireAuthenticatedUserId(c);
    const { phoneNumber } = c.req.valid("json");
    const profile = await updateCurrentUserPhoneNumber(userId, phoneNumber);

    return c.json({
      ...profile,
      avatar: resolveAvatarUrl(c.req.url, profile.avatar),
    });
  });
