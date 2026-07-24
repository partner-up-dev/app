import { afterEach, describe, expect, it, vi } from "vitest";

const rpcMocks = vi.hoisted(() => ({
  generateWechatDescription: vi.fn<() => Promise<Response>>(),
  cacheWechatThumbnail: vi.fn<() => Promise<Response>>(),
  cacheXiaohongshuPoster: vi.fn<() => Promise<Response>>(),
}));

vi.mock("@/lib/rpc", () => ({
  client: {
    api: {
      share: {
        "wechat-card": {
          "generate-description": { $post: rpcMocks.generateWechatDescription },
          "cache-thumbnail": { $post: rpcMocks.cacheWechatThumbnail },
        },
        xiaohongshu: {
          "cache-poster": { $post: rpcMocks.cacheXiaohongshuPoster },
        },
      },
    },
  },
}));

import {
  cacheWechatShareThumbnail,
  cacheXiaohongshuSharePoster,
  generateWechatShareDescription,
} from "./share-command-adapter";

afterEach(() => {
  vi.clearAllMocks();
});

describe("Share command adapter", () => {
  it("maps the three command inputs to their exact inferred request bodies", async () => {
    rpcMocks.generateWechatDescription.mockResolvedValue(
      Response.json({ description: "一起去看展" }),
    );
    rpcMocks.cacheWechatThumbnail.mockResolvedValue(Response.json({ success: true }));
    rpcMocks.cacheXiaohongshuPoster.mockResolvedValue(Response.json({ success: true }));

    await expect(generateWechatShareDescription({ prId: 42 })).resolves.toEqual({
      ok: true,
      value: "一起去看展",
    });
    await cacheWechatShareThumbnail({
      prId: 42,
      style: 3,
      posterUrl: "https://example.com/wechat.png",
    });
    await cacheXiaohongshuSharePoster({
      prId: 42,
      caption: "周末看展搭子",
      posterStylePrompt: "warm editorial",
      posterUrl: "https://example.com/xhs.png",
    });

    expect(rpcMocks.generateWechatDescription).toHaveBeenCalledWith({
      json: { prId: 42 },
    });
    expect(rpcMocks.cacheWechatThumbnail).toHaveBeenCalledWith({
      json: {
        prId: 42,
        style: 3,
        posterUrl: "https://example.com/wechat.png",
      },
    });
    expect(rpcMocks.cacheXiaohongshuPoster).toHaveBeenCalledWith({
      json: {
        prId: 42,
        caption: "周末看展搭子",
        posterStylePrompt: "warm editorial",
        posterUrl: "https://example.com/xhs.png",
      },
    });
  });

  it("maps description Problem Details into a stable command error", async () => {
    rpcMocks.generateWechatDescription.mockResolvedValue(
      Response.json(
        {
          type: "https://partner-up.dev/problems/pr-not-accessible",
          code: "PR_NOT_ACCESSIBLE",
          detail: "该搭子不可分享",
        },
        { status: 404 },
      ),
    );

    await expect(generateWechatShareDescription({ prId: 42 })).resolves.toMatchObject({
      ok: false,
      error: {
        message: "该搭子不可分享",
        status: 404,
        code: "PR_NOT_ACCESSIBLE",
        type: "https://partner-up.dev/problems/pr-not-accessible",
      },
    });
  });

  it("maps failed best-effort cache writes without turning HTTP failures into exceptions", async () => {
    rpcMocks.cacheWechatThumbnail.mockResolvedValue(
      Response.json({ error: "thumbnail rejected" }, { status: 503 }),
    );
    rpcMocks.cacheXiaohongshuPoster.mockResolvedValue(
      Response.json({ detail: "poster rejected" }, { status: 409 }),
    );

    await expect(
      cacheWechatShareThumbnail({
        prId: 42,
        style: 0,
        posterUrl: "https://example.com/wechat.png",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        message: "thumbnail rejected",
        status: 503,
      },
    });
    await expect(
      cacheXiaohongshuSharePoster({
        prId: 42,
        caption: "caption",
        posterStylePrompt: "prompt",
        posterUrl: "https://example.com/xhs.png",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        message: "poster rejected",
        status: 409,
      },
    });
  });
});
