import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { scenario } from "../_infra/scenario/scenario";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { getTestDb } from "../_infra/probes/sql-probe";
import { issuePublicAuthForUser } from "../../src/auth/middleware";
import { users } from "../../src/entities/user";
import { givenAnonymousUser, givenAdminUser, givenUser } from "../pr/_kit/builders/users";

type AuthSessionResponse = {
  role: "anonymous" | "authenticated";
  roles: Array<"anonymous" | "authenticated">;
  userId: string | null;
  accessToken: string;
};

scenario("public_bearer_uses_current_active_public_identity", async () => {
  const active = await givenUser("public-session-active");
  const activeSession = await expectJsonResponse<AuthSessionResponse>(
    await requestJson("/api/auth/session", {
      method: "POST",
      token: active.token,
      body: {},
    }),
    200,
  );
  assert.equal(activeSession.role, "authenticated");
  assert.deepEqual(activeSession.roles, ["authenticated"]);
  assert.equal(activeSession.userId, active.user.id);

  await getTestDb().update(users).set({ status: "DISABLED" }).where(eq(users.id, active.user.id));
  const disabledSession = await expectJsonResponse<AuthSessionResponse>(
    await requestJson("/api/auth/session", {
      method: "POST",
      token: active.token,
      body: {},
    }),
    200,
  );
  assert.equal(disabledSession.role, "anonymous");
  assert.deepEqual(disabledSession.roles, ["anonymous"]);
  assert.equal(disabledSession.userId, null);
  assert.equal(
    (
      await requestJson("/api/users/me", {
        method: "GET",
        token: active.token,
      })
    ).status,
    401,
  );

  const upgradedAnonymous = await givenAnonymousUser("public-session-upgraded-anonymous");
  await getTestDb()
    .update(users)
    .set({ role: ["authenticated"] })
    .where(eq(users.id, upgradedAnonymous.user.id));
  const upgradedSession = await expectJsonResponse<AuthSessionResponse>(
    await requestJson("/api/auth/session", {
      method: "POST",
      token: upgradedAnonymous.token,
      body: {},
    }),
    200,
  );
  assert.equal(upgradedSession.role, "authenticated");
  assert.deepEqual(upgradedSession.roles, ["authenticated"]);
  assert.equal(upgradedSession.userId, upgradedAnonymous.user.id);

  const operatorTransition = await givenUser("public-session-operator-transition");
  await getTestDb()
    .update(users)
    .set({ role: ["service"] })
    .where(eq(users.id, operatorTransition.user.id));
  const transitionedOperatorSession = await expectJsonResponse<AuthSessionResponse>(
    await requestJson("/api/auth/session", {
      method: "POST",
      token: operatorTransition.token,
      body: {},
    }),
    200,
  );
  assert.equal(transitionedOperatorSession.role, "anonymous");
  assert.deepEqual(transitionedOperatorSession.roles, ["anonymous"]);
  assert.equal(transitionedOperatorSession.userId, null);

  const operator = await givenAdminUser("public-session-operator");
  assert.equal(issuePublicAuthForUser(operator.user), null);
  const operatorSession = await expectJsonResponse<AuthSessionResponse>(
    await requestJson("/api/auth/session", {
      method: "POST",
      token: operator.token,
      body: {},
    }),
    200,
  );
  assert.equal(operatorSession.role, "anonymous");
  assert.deepEqual(operatorSession.roles, ["anonymous"]);
  assert.equal(operatorSession.userId, null);
  assert.equal(
    (
      await requestJson("/api/users/me", {
        method: "GET",
        token: operator.token,
      })
    ).status,
    401,
  );
});

scenario("public_session_restores_active_anonymous_uuid", async () => {
  const anonymous = await givenAnonymousUser("public-session-restore");
  const session = await expectJsonResponse<AuthSessionResponse>(
    await requestJson("/api/auth/session", {
      method: "POST",
      body: { userId: anonymous.user.id },
    }),
    200,
  );

  assert.equal(session.role, "anonymous");
  assert.deepEqual(session.roles, ["anonymous"]);
  assert.equal(session.userId, anonymous.user.id);
  assert.ok(session.accessToken.length > 0);

  await getTestDb()
    .update(users)
    .set({ status: "DISABLED" })
    .where(eq(users.id, anonymous.user.id));
  assert.equal(
    (
      await requestJson("/api/auth/session", {
        method: "POST",
        body: { userId: anonymous.user.id },
      })
    ).status,
    401,
  );
});
