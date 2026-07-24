import { throwHttpProblem } from "../lib/problem-details";
import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  authMiddleware,
  issueAnonymousAuth,
  issueOperatorAuthForIdentity,
} from "../auth/middleware";
import type { AuthEnv } from "../auth/middleware";
import { authenticateOperatorCredential, registerAnonymousUser } from "../domains/user";
import { findCurrentPublicUserIdentity } from "../domains/user/queries";
import { setAnonymousSessionCookie } from "../auth/anonymous-session";

const app = new Hono<AuthEnv>();

const authSessionSchema = z.object({
  userId: z.string().uuid().optional().nullable(),
});

const adminLoginSchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(1),
});

export const authRoute = app
  .use("*", authMiddleware)
  .post("/admin/login", zValidator("json", adminLoginSchema), async (c) => {
    const { userId, password } = c.req.valid("json");
    const identity = await authenticateOperatorCredential({
      userId,
      credential: password,
    });
    if (!identity) {
      return throwHttpProblem({ status: 401, detail: "Invalid admin credentials" });
    }

    const authenticated = issueOperatorAuthForIdentity(identity);
    c.set("auth", authenticated);
    return c.json({
      role: authenticated.role,
      roles: authenticated.roles,
      userId: identity.userId,
      accessToken: authenticated.token,
    });
  })
  .post("/register/anonymous", async (c) => {
    const auth = c.get("auth");
    if (auth.role === "anonymous" && auth.userId) {
      await setAnonymousSessionCookie(c, auth.userId);
      return c.json({
        role: "anonymous",
        roles: auth.roles,
        userId: auth.userId,
        accessToken: auth.token,
      });
    }

    const registered = await registerAnonymousUser();
    const anonymous = issueAnonymousAuth(registered.userId);
    c.set("auth", anonymous);
    await setAnonymousSessionCookie(c, registered.userId);

    return c.json({
      role: "anonymous" as const,
      roles: anonymous.roles,
      userId: registered.userId,
      accessToken: anonymous.token,
    });
  })
  .post("/session", zValidator("json", authSessionSchema), async (c) => {
    const auth = c.get("auth");
    if (auth.userId) {
      return c.json({
        role: auth.role,
        roles: auth.roles,
        userId: auth.userId,
        accessToken: auth.token,
      });
    }

    const body = c.req.valid("json");
    const candidateUserId = body.userId ?? null;

    if (candidateUserId) {
      const candidateIdentity = await findCurrentPublicUserIdentity(candidateUserId);
      if (!candidateIdentity || candidateIdentity.role !== "anonymous") {
        return throwHttpProblem({ status: 401, detail: "Invalid anonymous user session" });
      }

      const anonymous = issueAnonymousAuth(candidateIdentity.userId);
      c.set("auth", anonymous);
      await setAnonymousSessionCookie(c, candidateIdentity.userId);
      return c.json({
        role: "anonymous" as const,
        roles: anonymous.roles,
        userId: candidateIdentity.userId,
        accessToken: anonymous.token,
      });
    }

    const anonymous = issueAnonymousAuth(null);
    return c.json({
      role: "anonymous" as const,
      roles: anonymous.roles,
      userId: null,
      accessToken: anonymous.token,
    });
  });
