import { beforeEach, describe, expect, test, vi } from "vitest";
import type {
  AdminLoginInput,
  AdminLoginOptions,
  AdminLoginResponse,
} from "@/domains/admin/queries/useAdminLogin";
import { useAdminSessionLogin } from "./useAdminSessionLogin";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn<(input: AdminLoginInput) => Promise<AdminLoginResponse>>(),
  applyAuthSession: vi.fn<(payload: unknown) => void>(),
  isPending: { value: false },
  error: { value: null as Error | null },
  useAdminLogin: vi.fn<(options?: AdminLoginOptions) => unknown>(),
}));

vi.mock("@/domains/admin/queries/useAdminLogin", () => ({
  useAdminLogin: (options?: AdminLoginOptions) => {
    mocks.useAdminLogin(options);
    return {
      mutateAsync: mocks.mutateAsync,
      isPending: mocks.isPending,
      error: mocks.error,
    };
  },
}));

vi.mock("./useAdminSessionStore", () => ({
  useAdminSessionStore: () => ({
    applyAuthSession: mocks.applyAuthSession,
  }),
}));

describe("Admin session login workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isPending.value = false;
    mocks.error.value = null;
  });

  test("applies the authenticated session returned by the login query", async () => {
    const input = {
      userId: "00000000-0000-0000-0000-000000000002",
      password: "analytics-code",
    };
    const response: AdminLoginResponse = {
      role: "analytics",
      roles: ["analytics"],
      userId: input.userId,
      accessToken: "analytics-access-token",
    };
    mocks.mutateAsync.mockResolvedValue(response);

    const workflow = useAdminSessionLogin();

    await expect(workflow.login(input)).resolves.toBe(response);
    expect(mocks.mutateAsync).toHaveBeenCalledWith(input);
    expect(mocks.applyAuthSession).toHaveBeenCalledWith(response);
  });

  test("does not modify the current session when login fails", async () => {
    const error = new Error("Invalid admin credentials");
    mocks.error.value = error;
    mocks.mutateAsync.mockRejectedValue(error);
    const workflow = useAdminSessionLogin({ failureMessage: "BI 登录失败，请检查 code。" });

    await expect(
      workflow.login({
        userId: "00000000-0000-0000-0000-000000000002",
        password: "invalid-code",
      }),
    ).rejects.toBe(error);
    expect(mocks.applyAuthSession).not.toHaveBeenCalled();
    expect(workflow.errorMessage.value).toBe("Invalid admin credentials");
    expect(mocks.useAdminLogin).toHaveBeenCalledWith({
      failureMessage: "BI 登录失败，请检查 code。",
    });
  });
});
