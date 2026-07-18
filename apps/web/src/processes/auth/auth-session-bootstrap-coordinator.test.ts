import { describe, expect, it, vi } from "vitest";
import {
  runAuthSessionBootstrapCoordinator,
  type AuthSessionBootstrapBoundary,
} from "./auth-session-bootstrap-coordinator";
import type { AuthSessionPayload } from "@/shared/auth/useUserSessionStore";

const session = (userId: string, role: AuthSessionPayload["role"] = "anonymous") => ({
  role,
  userId,
  accessToken: `${role}-token`,
});

const createBoundary = (
  overrides: Partial<AuthSessionBootstrapBoundary> = {},
): AuthSessionBootstrapBoundary => ({
  readAccessToken: vi.fn<() => string | null>(() => null),
  readUserId: vi.fn<() => string | null>(() => null),
  registerAnonymous: vi.fn<() => Promise<AuthSessionPayload | null>>(async () =>
    session("anonymous-user"),
  ),
  restoreSession: vi.fn<
    (userId: string | null) => Promise<{ status: number; payload?: AuthSessionPayload }>
  >(async () => ({ status: 200, payload: session("restored-user") })),
  clearPublicSession: vi.fn<() => void>(),
  applySession: vi.fn<(payload: AuthSessionPayload) => void>(),
  ...overrides,
});

describe("auth session bootstrap coordinator", () => {
  it("registers a clean browser once without restoring afterward", async () => {
    const boundary = createBoundary();

    await runAuthSessionBootstrapCoordinator(boundary);

    expect(boundary.registerAnonymous).toHaveBeenCalledOnce();
    expect(boundary.restoreSession).not.toHaveBeenCalled();
    expect(boundary.applySession).toHaveBeenCalledWith(session("anonymous-user"));
  });

  it("restores an existing browser session", async () => {
    const boundary = createBoundary({
      readAccessToken: () => "stale-or-valid-token",
      readUserId: () => "anonymous-user",
    });

    await runAuthSessionBootstrapCoordinator(boundary);

    expect(boundary.restoreSession).toHaveBeenCalledOnce();
    expect(boundary.restoreSession).toHaveBeenCalledWith("anonymous-user");
    expect(boundary.registerAnonymous).not.toHaveBeenCalled();
    expect(boundary.applySession).toHaveBeenCalledWith(session("restored-user"));
  });

  it("clears rejected state and registers exactly once after a 401", async () => {
    const boundary = createBoundary({
      readUserId: () => "rejected-user",
      restoreSession: vi.fn<
        (userId: string | null) => Promise<{ status: number; payload?: AuthSessionPayload }>
      >(async () => ({ status: 401 })),
    });

    await runAuthSessionBootstrapCoordinator(boundary);

    expect(boundary.clearPublicSession).toHaveBeenCalledOnce();
    expect(boundary.registerAnonymous).toHaveBeenCalledOnce();
    expect(boundary.applySession).toHaveBeenCalledWith(session("anonymous-user"));
  });

  it("does not loop or register after a non-401 restore failure", async () => {
    const boundary = createBoundary({
      readUserId: () => "existing-user",
      restoreSession: vi.fn<
        (userId: string | null) => Promise<{ status: number; payload?: AuthSessionPayload }>
      >(async () => ({ status: 500 })),
    });

    await runAuthSessionBootstrapCoordinator(boundary);

    expect(boundary.registerAnonymous).not.toHaveBeenCalled();
    expect(boundary.clearPublicSession).not.toHaveBeenCalled();
    expect(boundary.applySession).not.toHaveBeenCalled();
  });
});
