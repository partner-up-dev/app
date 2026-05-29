import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  handleWeChatPaymentNotification,
  handleWeChatRefundNotification,
} from "../domains/payment";

const app = new Hono();

const providerInstanceParamSchema = z.object({
  providerInstanceId: z.string().uuid(),
});

const readWechatHeaders = (c: Context) => ({
  timestamp: c.req.header("Wechatpay-Timestamp") ?? null,
  nonce: c.req.header("Wechatpay-Nonce") ?? null,
  signature: c.req.header("Wechatpay-Signature") ?? null,
  serial: c.req.header("Wechatpay-Serial") ?? null,
});

export const paymentProviderRoute = app
  .post(
    "/wechat/:providerInstanceId/notify/payment",
    zValidator("param", providerInstanceParamSchema),
    async (c) => {
      const { providerInstanceId } = c.req.valid("param");
      const result = await handleWeChatPaymentNotification({
        providerInstanceId,
        headers: readWechatHeaders(c),
        bodyText: await c.req.text(),
      });
      return c.json(result);
    },
  )
  .post(
    "/wechat/:providerInstanceId/notify/refund",
    zValidator("param", providerInstanceParamSchema),
    async (c) => {
      const { providerInstanceId } = c.req.valid("param");
      const result = await handleWeChatRefundNotification({
        providerInstanceId,
        headers: readWechatHeaders(c),
        bodyText: await c.req.text(),
      });
      return c.json(result);
    },
  );
