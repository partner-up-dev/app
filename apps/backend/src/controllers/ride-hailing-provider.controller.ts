import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  handleCaocaoOrderStatusCallback,
  handleLegacyCaocaoOrderStatusCallback,
} from "../domains/ride-hailing";

const rideHailingProviderApp = new Hono();
const legacyRideHailingProviderApp = new Hono();

const providerInstanceParamSchema = z.object({
  providerInstanceId: z.string().uuid(),
});

const readStringForm = async (request: Request): Promise<Record<string, string>> => {
  const formData = await request.formData();
  const form: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      form[key] = value;
    }
  }
  return form;
};

export const rideHailingProviderRoute = rideHailingProviderApp.post(
  "/caocao/:providerInstanceId/callback/order-status",
  zValidator("param", providerInstanceParamSchema),
  async (c) => {
    const { providerInstanceId } = c.req.valid("param");
    const result = await handleCaocaoOrderStatusCallback({
      providerInstanceId,
      form: await readStringForm(c.req.raw),
    });
    return c.json(result);
  },
);

export const legacyRideHailingProviderRoute = legacyRideHailingProviderApp.post(
  "/caocao/callback/order",
  async (c) => {
    const result = await handleLegacyCaocaoOrderStatusCallback({
      form: await readStringForm(c.req.raw),
    });
    return c.json(result);
  },
);
