import type { Page } from "playwright";
import type { ScenarioUser } from "../../../../apps/backend/tests/pr-core/_kit/builders/users";

const STORAGE_USER_ID_KEY = "partner_up_user_id";
const STORAGE_ACCESS_TOKEN_KEY = "partner_up_access_token";
const STORAGE_SESSION_ROLE_KEY = "partner_up_session_role";
const OFFICIAL_ACCOUNT_FOLLOW_PROMPT_KEY = "__partner_up_official_account_follow_prompt_v1__";

const resolvePrimaryScenarioRole = (
  roles: ScenarioUser["user"]["role"],
): "anonymous" | "authenticated" | "service" => {
  if (roles.includes("service")) return "service";
  if (roles.includes("authenticated")) return "authenticated";
  return "anonymous";
};

export async function installScenarioUserSession(page: Page, user: ScenarioUser): Promise<void> {
  await page.addInitScript(
    (session) => {
      window.localStorage.setItem(session.userIdKey, session.userId);
      window.localStorage.setItem(session.accessTokenKey, session.token);
      window.localStorage.setItem(session.roleKey, session.role);
      window.localStorage.setItem(
        session.officialAccountFollowPromptKey,
        JSON.stringify({
          action: "dismissed",
          cooldownUntilMs: Date.now() + 24 * 60 * 60 * 1000,
          source: "pr_join_result",
          updatedAtMs: Date.now(),
        }),
      );
    },
    {
      accessTokenKey: STORAGE_ACCESS_TOKEN_KEY,
      officialAccountFollowPromptKey: OFFICIAL_ACCOUNT_FOLLOW_PROMPT_KEY,
      role: resolvePrimaryScenarioRole(user.user.role),
      roleKey: STORAGE_SESSION_ROLE_KEY,
      token: user.token,
      userId: user.user.id,
      userIdKey: STORAGE_USER_ID_KEY,
    },
  );
}
