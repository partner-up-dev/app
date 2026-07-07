import assert from "node:assert/strict";
import { test } from "vitest";
import { runRouteWeChatAutoLoginAttempt } from "./useRouteWeChatAutoLogin";

test("route auto-login waits for auth bootstrap before redirecting", async () => {
  const calls: string[] = [];
  let authenticated = false;
  let redirecting = false;

  const result = await runRouteWeChatAutoLoginAttempt({
    resolveRouteKey: () => "/pr/1",
    hasPendingHandoff: () => false,
    ensureAuthSessionBootstrapped: async () => {
      calls.push("bootstrap");
      authenticated = true;
    },
    isAuthenticated: () => authenticated,
    clearRouteAttempted: (routeKey) => calls.push(`clear:${routeKey}`),
    isWeChatAbilityEnv: () => true,
    hasRouteAttempted: () => false,
    markRouteAttempted: (routeKey) => calls.push(`mark:${routeKey}`),
    isRedirecting: () => redirecting,
    setRedirecting: (value) => {
      redirecting = value;
      calls.push(`redirecting:${String(value)}`);
    },
    getReturnTo: () => "https://partner-up.test/pr/1",
    requestLogin: (returnTo) => {
      calls.push(`login:${returnTo}`);
      return true;
    },
  });

  assert.equal(result, "authenticated");
  assert.deepEqual(calls, ["bootstrap", "clear:/pr/1"]);
});

test("route auto-login and a concurrent redirect share redirecting state", async () => {
  const calls: string[] = [];
  let redirecting = false;
  const bootstrap = Promise.resolve();

  const runtime = {
    resolveRouteKey: () => "/pr/1",
    hasPendingHandoff: () => false,
    ensureAuthSessionBootstrapped: async () => {
      await bootstrap;
    },
    isAuthenticated: () => false,
    clearRouteAttempted: (routeKey: string) => calls.push(`clear:${routeKey}`),
    isWeChatAbilityEnv: () => true,
    hasRouteAttempted: () => false,
    markRouteAttempted: (routeKey: string) => calls.push(`mark:${routeKey}`),
    isRedirecting: () => redirecting,
    setRedirecting: (value: boolean) => {
      redirecting = value;
      calls.push(`redirecting:${String(value)}`);
    },
    getReturnTo: () => "https://partner-up.test/pr/1",
    requestLogin: (returnTo: string) => {
      calls.push(`login:${returnTo}`);
      return true;
    },
  };

  const [first, second] = await Promise.all([
    runRouteWeChatAutoLoginAttempt(runtime),
    runRouteWeChatAutoLoginAttempt(runtime),
  ]);

  assert.deepEqual([first, second], ["redirecting", "redirecting"]);
  assert.deepEqual(calls, [
    "mark:/pr/1",
    "redirecting:true",
    "login:https://partner-up.test/pr/1",
  ]);
});
