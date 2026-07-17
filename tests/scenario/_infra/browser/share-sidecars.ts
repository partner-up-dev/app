import type { Page } from "playwright";

const thumbnailHtml = [
  "<!doctype html>",
  "<html>",
  "<body>",
  '<div id="poster-root" style="width:300px;height:300px;background:#fff;display:grid;place-items:center;font-size:64px;">搭子</div>',
  "</body>",
  "</html>",
].join("");

export async function installDeterministicShareSidecarStubs(page: Page): Promise<void> {
  await page.route("**/api/share/xiaohongshu/poster-html", (route) =>
    route.fulfill({
      contentType: "application/json; charset=utf-8",
      json: {
        backgroundColor: "#ffffff",
        height: 1080,
        html: thumbnailHtml.replace("300px;height:300px", "720px;height:1080px"),
        width: 720,
      },
      status: 200,
    }),
  );

  await page.route("**/api/share/wechat-card/generate-description", (route) =>
    route.fulfill({
      contentType: "application/json; charset=utf-8",
      json: {
        description: "测试分享描述",
      },
      status: 200,
    }),
  );

  await page.route("**/api/share/wechat-card/thumbnail-html", (route) =>
    route.fulfill({
      contentType: "application/json; charset=utf-8",
      json: {
        backgroundColor: "#ffffff",
        height: 300,
        html: thumbnailHtml,
        meta: {
          keyText: "搭子",
        },
        width: 300,
      },
      status: 200,
    }),
  );

  await page.route("**/api/upload/images/poster", (route) =>
    route.fulfill({
      contentType: "application/json; charset=utf-8",
      json: {
        key: "00000000-0000-4000-8000-000000000000",
        url: "/api/upload/images/poster/00000000-0000-4000-8000-000000000000",
      },
      status: 200,
    }),
  );

  await page.route("**/api/upload/images/poster/*", (route) =>
    route.fulfill({
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
        "base64",
      ),
      contentType: "image/png",
      status: 200,
    }),
  );

  await page.route("**/api/llm/xiaohongshu-caption**", (route) =>
    route.fulfill({
      contentType: "application/json; charset=utf-8",
      json: {
        caption: "测试搭子文案",
        posterStylePrompt: "简洁信息海报",
      },
      status: 200,
    }),
  );
}
