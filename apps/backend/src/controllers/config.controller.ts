import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { ConfigService } from "../services/ConfigService";

const app = new Hono();
const configService = new ConfigService();

const publicConfigParamSchema = z.object({
  key: z.enum([
    "author_wechat_qr_code",
    "home_page_wechat_qr_code",
    "wecom_service_qr_code",
    "wecom_support_link_wechat_in",
    "wecom_support_link_wechat_out",
    "wechat_official_account_qr_code",
  ]),
});

export const configRoute = app.get(
  "/public/:key",
  zValidator("param", publicConfigParamSchema),
  async (c) => {
    const { key } = c.req.valid("param");
    const value = await configService.getValue(key);

    return c.json({
      key,
      value,
    });
  },
);
