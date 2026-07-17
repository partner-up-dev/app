import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { ShareService } from "../services/ShareService";

const app = new Hono();
const service = new ShareService();

const prIdSchema = z.coerce.number().int().positive();

const xhsPosterHtmlRequestSchema = z.object({
  prId: prIdSchema,
  caption: z.string().min(1).max(120),
  posterStylePrompt: z.string(),
});

const wechatCardThumbnailHtmlRequestSchema = z.object({
  prId: prIdSchema,
  style: z.coerce.number().int().optional(),
});

const xhsCachePosterRequestSchema = z.object({
  prId: prIdSchema,
  caption: z.string().min(1).max(120),
  posterStylePrompt: z.string(),
  posterUrl: z.string().url(),
});

const xhsGetCachedPosterRequestSchema = z.object({
  prId: prIdSchema,
  caption: z.string().min(1).max(120),
  posterStylePrompt: z.string(),
});

const wechatCacheThumbnailRequestSchema = z.object({
  prId: prIdSchema,
  style: z.coerce.number().int(),
  posterUrl: z.string().url(),
});

const wechatGetCachedThumbnailRequestSchema = z.object({
  prId: prIdSchema,
  style: z.coerce.number().int(),
});

const wechatGenerateDescriptionRequestSchema = z.object({
  prId: prIdSchema,
});

export const shareRoute = app
  .post("/xiaohongshu/poster-html", zValidator("json", xhsPosterHtmlRequestSchema), async (c) => {
    const { prId, caption, posterStylePrompt } = c.req.valid("json");
    const result = await service.generateXiaohongshuPosterHtml({
      prId,
      caption,
      posterStylePrompt,
    });
    return c.json(result);
  })
  .post(
    "/wechat-card/thumbnail-html",
    zValidator("json", wechatCardThumbnailHtmlRequestSchema),
    async (c) => {
      const { prId, style } = c.req.valid("json");
      const result = await service.generateWeChatCardThumbnailHtml({
        prId,
        style,
      });
      return c.json(result);
    },
  )
  .post(
    "/wechat-card/generate-description",
    zValidator("json", wechatGenerateDescriptionRequestSchema),
    async (c) => {
      const { prId } = c.req.valid("json");
      const description = await service.generateWeChatCardDescription({
        prId,
      });
      return c.json({ description });
    },
  )
  .post(
    "/xiaohongshu/get-cached-poster",
    zValidator("json", xhsGetCachedPosterRequestSchema),
    async (c) => {
      const { prId, caption, posterStylePrompt } = c.req.valid("json");
      const posterUrl = await service.getCachedXiaohongshuPoster({
        prId,
        caption,
        posterStylePrompt,
      });
      return c.json({ posterUrl });
    },
  )
  .post("/xiaohongshu/cache-poster", zValidator("json", xhsCachePosterRequestSchema), async (c) => {
    const { prId, caption, posterStylePrompt, posterUrl } = c.req.valid("json");
    await service.cacheXiaohongshuPoster({
      prId,
      caption,
      posterStylePrompt,
      posterUrl,
    });
    return c.json({ success: true });
  })
  .post(
    "/wechat-card/cache-thumbnail",
    zValidator("json", wechatCacheThumbnailRequestSchema),
    async (c) => {
      const { prId, style, posterUrl } = c.req.valid("json");
      await service.cacheWechatThumbnail({
        prId,
        style,
        posterUrl,
      });
      return c.json({ success: true });
    },
  )
  .post(
    "/wechat-card/get-cached-thumbnail",
    zValidator("json", wechatGetCachedThumbnailRequestSchema),
    async (c) => {
      const { prId, style } = c.req.valid("json");
      const posterUrl = await service.getCachedWechatThumbnail({ prId, style });
      return c.json({ posterUrl });
    },
  );
