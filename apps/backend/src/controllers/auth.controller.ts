import { throwHttpProblem } from "../lib/problem-details";
import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware, issueAnonymousAuth, issueAuthForUser } from "../auth/middleware";
import type { AuthEnv } from "../auth/middleware";
import { hasAnyUserRole, hasUserRole, type UserId } from "../entities/user";
import { UserRepository } from "../repositories/UserRepository";
import { registerAnonymousUser, verifyUserCredential } from "../domains/user";
import { setAnonymousSessionCookie } from "../auth/anonymous-session";

const app = new Hono<AuthEnv>();
const userRepo = new UserRepository();

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
    const user = await userRepo.findById(userId);
    if (
      !user ||
      !hasAnyUserRole(user.role, ["service", "analytics"]) ||
      !(await verifyUserCredential(user, password))
    ) {
      return throwHttpProblem({ status: 401, detail: "Invalid admin credentials" });
    }

    const authenticated = issueAuthForUser(user);
    c.set("auth", authenticated);
    return c.json({
      role: authenticated.role,
      roles: authenticated.roles,
      userId: user.id,
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
    await setAnonymousSessionCookie(c, registered.userId);

    return c.json(registered);
  })
  .post("/session", zValidator("json", authSessionSchema), async (c) => {
    const auth = c.get("auth");
    if (auth.role !== "anonymous" && auth.userId) {
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
      const candidateUser = await userRepo.findById(candidateUserId as UserId);
      if (
        !candidateUser ||
        candidateUser.status !== "ACTIVE" ||
        !hasUserRole(candidateUser.role, "anonymous")
      ) {
        return throwHttpProblem({ status: 401, detail: "Invalid anonymous user session" });
      }

      const anonymous = issueAnonymousAuth(candidateUser.id);
      c.set("auth", anonymous);
      await setAnonymousSessionCookie(c, candidateUser.id);
      return c.json({
        role: "anonymous" as const,
        roles: anonymous.roles,
        userId: candidateUser.id,
        accessToken: anonymous.token,
      });
    }

    if (auth.role === "anonymous" && auth.userId) {
      return c.json({
        role: auth.role,
        roles: auth.roles,
        userId: auth.userId,
        accessToken: auth.token,
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
