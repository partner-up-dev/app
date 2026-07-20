import assert from "node:assert/strict";
import type { Pinia } from "pinia";
import type { Router } from "vue-router";
import { test } from "vitest";
import {
  createRouteWeChatAutoLoginGuard,
  installRouteWeChatAutoLoginGuard,
  runRouteWeChatAutoLoginAttempt,
  type RouteEntryTarget,
  type RouteWeChatAutoLoginGuardRuntime,
} from "./route-wechat-auto-login";

type NavigationEpoch = { value: number };

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
  assert.deepEqual(calls, ["mark:/pr/1", "redirecting:true", "login:https://partner-up.test/pr/1"]);
});

const createGuardRuntime = (
  calls: string[],
  overrides: Partial<RouteWeChatAutoLoginGuardRuntime> = {},
): RouteWeChatAutoLoginGuardRuntime => ({
  hasPendingHandoff: () => false,
  ensureAuthSessionBootstrapped: async () => {
    calls.push("bootstrap");
  },
  isAuthenticated: () => false,
  clearRouteAttempted: (routeKey) => calls.push(`clear:${routeKey}`),
  isWeChatAbilityEnv: () => true,
  hasRouteAttempted: () => false,
  markRouteAttempted: (routeKey) => calls.push(`mark:${routeKey}`),
  getReturnTo: (route) => `https://partner-up.test${route.fullPath}`,
  requestLogin: (returnTo) => {
    calls.push(`login:${returnTo}`);
    return true;
  },
  ...overrides,
});

const billsRoute = (overrides: Partial<RouteEntryTarget> = {}): RouteEntryTarget => ({
  path: "/bills",
  fullPath: "/bills?tab=current",
  meta: {
    wechatAutoLoginPolicy: "route",
  },
  query: {
    tab: "current",
  },
  ...overrides,
});

test("eligible anonymous WeChat navigation starts OAuth and stops before the route mounts", async () => {
  const calls: string[] = [];
  const guard = createRouteWeChatAutoLoginGuard(createGuardRuntime(calls));

  const allowed = await guard(billsRoute());

  assert.equal(allowed, false);
  assert.deepEqual(calls, [
    "bootstrap",
    "mark:/bills",
    "login:https://partner-up.test/bills?tab=current",
  ]);
});

test("a superseded deferred navigation becomes inert before marking or starting OAuth", async () => {
  const calls: string[] = [];
  const navigationEpoch: NavigationEpoch = { value: 0 };
  let resolveBootstrap!: () => void;
  const bootstrap = new Promise<void>((resolve) => {
    resolveBootstrap = resolve;
  });
  const guard = createRouteWeChatAutoLoginGuard(
    createGuardRuntime(calls, {
      ensureAuthSessionBootstrapped: async () => {
        calls.push("bootstrap");
        await bootstrap;
      },
    }),
    navigationEpoch,
  );
  let beforeEachHook!: () => void;
  let beforeResolveHook!: (route: RouteEntryTarget) => Promise<boolean>;
  const fakeRouter = {
    beforeEach: (hook: () => void) => {
      beforeEachHook = hook;
      return () => undefined;
    },
    beforeResolve: (hook: (route: RouteEntryTarget) => Promise<boolean>) => {
      beforeResolveHook = hook;
      return () => undefined;
    },
  };
  fakeRouter.beforeEach(() => {
    navigationEpoch.value += 1;
  });
  fakeRouter.beforeResolve(guard);

  const firstNavigation = beforeResolveHook(billsRoute());
  // Vue Router's earliest beforeEach signal invalidates A before B reaches beforeResolve.
  beforeEachHook();
  resolveBootstrap();

  assert.equal(await firstNavigation, true);
  assert.deepEqual(calls, ["bootstrap"]);
});

test("pending handoff and routes without an explicit opt-in pass through unchanged", async () => {
  const pendingCalls: string[] = [];
  const pendingGuard = createRouteWeChatAutoLoginGuard(
    createGuardRuntime(pendingCalls, {
      hasPendingHandoff: () => true,
    }),
  );

  assert.equal(await pendingGuard(billsRoute()), true);
  assert.deepEqual(pendingCalls, []);

  const targetNonceCalls: string[] = [];
  const targetNonceGuard = createRouteWeChatAutoLoginGuard(createGuardRuntime(targetNonceCalls));

  assert.equal(
    await targetNonceGuard(
      billsRoute({
        fullPath: "/bills?wechatOAuthHandoff=nonce-1",
        query: { wechatOAuthHandoff: "nonce-1" },
      }),
    ),
    true,
  );
  assert.deepEqual(targetNonceCalls, []);

  const ordinaryCalls: string[] = [];
  const ordinaryGuard = createRouteWeChatAutoLoginGuard(createGuardRuntime(ordinaryCalls));

  assert.equal(
    await ordinaryGuard(
      billsRoute({
        path: "/me",
        fullPath: "/me",
        meta: {},
        query: {},
      }),
    ),
    true,
  );
  assert.deepEqual(ordinaryCalls, []);
});

test("non-WeChat and already-attempted eligible navigations do not loop a redirect", async () => {
  const nonWeChatCalls: string[] = [];
  const nonWeChatGuard = createRouteWeChatAutoLoginGuard(
    createGuardRuntime(nonWeChatCalls, {
      isWeChatAbilityEnv: () => false,
    }),
  );

  assert.equal(await nonWeChatGuard(billsRoute()), true);
  assert.deepEqual(nonWeChatCalls, ["bootstrap"]);

  const attemptedCalls: string[] = [];
  const attemptedGuard = createRouteWeChatAutoLoginGuard(
    createGuardRuntime(attemptedCalls, {
      hasRouteAttempted: () => true,
    }),
  );

  assert.equal(await attemptedGuard(billsRoute()), true);
  assert.deepEqual(attemptedCalls, ["bootstrap"]);
});

test("route auto-login installs once on the router entry lifecycle", () => {
  let epochRegistrations = 0;
  let registrations = 0;
  let epochRemovals = 0;
  let removals = 0;
  const router: Pick<Router, "beforeEach" | "beforeResolve"> = {
    beforeEach() {
      epochRegistrations += 1;
      return () => {
        epochRemovals += 1;
      };
    },
    beforeResolve() {
      registrations += 1;
      return () => {
        removals += 1;
      };
    },
  };

  const removeGuard = installRouteWeChatAutoLoginGuard(router, {} as Pinia);

  assert.equal(epochRegistrations, 1);
  assert.equal(registrations, 1);
  removeGuard();
  assert.equal(epochRemovals, 1);
  assert.equal(removals, 1);
});
