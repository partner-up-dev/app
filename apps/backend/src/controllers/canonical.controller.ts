// @ts-nocheck

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { YourService } from "../services/YourService";

const app = new Hono();
const yourService = new YourService();

// 定义路由变量，用于导出类型
export const yourRoute = app
  .get("/:id", zValidator("param", z.object({ id: z.coerce.number() })), async (c) => {
    const { id } = c.req.valid("param");
    const user = await yourService.getSomething(id);
    return c.json(user);
  })
  .post("/", zValidator("json", z.object({ name: z.string(), email: z.string() })), async (c) => {
    // Create logic...
    return c.json({ success: true });
  });
