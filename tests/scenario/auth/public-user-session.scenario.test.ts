import assert from "node:assert/strict";
import type { Page } from "playwright";
import { setTestUserStatus } from "../../../apps/backend/tests/_infra/actions/user-state";
import { withScenarioPage } from "../_infra/browser/browser";
import { scenario } from "../_infra/scenario/scenario";

const STORAGE_USER_ID_KEY = "partner_up_user_id";
const STORAGE_ACCESS_TOKEN_KEY = "partner_up_access_token";
const STORAGE_SESSION_ROLE_KEY = "partner_up_session_role";

type PublicBrowserSession = {
  userId: string;
  accessToken: string;
  role: string;
};

const readPublicBrowserSession = async (page: Page): Promise<PublicBrowserSession> =>
  page.evaluate(
    ({ accessTokenKey, roleKey, userIdKey }) => ({
      accessToken: window.localStorage.getItem(accessTokenKey) ?? "",
      role: window.localStorage.getItem(roleKey) ?? "",
      userId: window.localStorage.getItem(userIdKey) ?? "",
    }),
    {
      accessTokenKey: STORAGE_ACCESS_TOKEN_KEY,
      roleKey: STORAGE_SESSION_ROLE_KEY,
      userIdKey: STORAGE_USER_ID_KEY,
    },
  );

const waitForAnonymousBrowserSession = async (
  page: Page,
  constraint: { userId?: string; differentFromUserId?: string } = {},
): Promise<PublicBrowserSession> => {
  await page.waitForFunction(
    ({ accessTokenKey, differentFromId, expectedId, roleKey, userIdKey }) => {
      const userId = window.localStorage.getItem(userIdKey);
      const accessToken = window.localStorage.getItem(accessTokenKey);
      const role = window.localStorage.getItem(roleKey);
      return (
        Boolean(userId) &&
        Boolean(accessToken) &&
        role === "anonymous" &&
        (!expectedId || userId === expectedId) &&
        (!differentFromId || userId !== differentFromId)
      );
    },
    {
      accessTokenKey: STORAGE_ACCESS_TOKEN_KEY,
      differentFromId: constraint.differentFromUserId ?? null,
      expectedId: constraint.userId ?? null,
      roleKey: STORAGE_SESSION_ROLE_KEY,
      userIdKey: STORAGE_USER_ID_KEY,
    },
  );

  return readPublicBrowserSession(page);
};

const removeStoredAccessToken = async (page: Page): Promise<void> => {
  await page.evaluate((accessTokenKey) => {
    window.localStorage.removeItem(accessTokenKey);
  }, STORAGE_ACCESS_TOKEN_KEY);
};

scenario(
  "public_session_bootstrap_restores_anonymous_uuid_and_replaces_disabled_identity",
  async (ctx) => {
    await withScenarioPage(async (page) => {
      await page.goto("/");
      const initial = await waitForAnonymousBrowserSession(page);
      assert.match(initial.userId, /^[0-9a-f-]{36}$/i);
      assert.ok(initial.accessToken.length > 0);

      await removeStoredAccessToken(page);
      await page.reload();
      const restored = await waitForAnonymousBrowserSession(page, { userId: initial.userId });
      assert.equal(restored.userId, initial.userId);
      assert.ok(restored.accessToken.length > 0);

      await setTestUserStatus({
        status: "DISABLED",
        userId: initial.userId,
      });

      await removeStoredAccessToken(page);
      await page.reload();
      const replacement = await waitForAnonymousBrowserSession(page, {
        differentFromUserId: initial.userId,
      });
      assert.notEqual(replacement.userId, initial.userId);
      assert.ok(replacement.accessToken.length > 0);

      ctx.record("initialAnonymousUserId", initial.userId);
      ctx.record("restoredAnonymousUserId", restored.userId);
      ctx.record("replacementAnonymousUserId", replacement.userId);
    });
  },
);
