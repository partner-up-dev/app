import { beforeEach, describe, expect, test, vi } from "vitest";
import { type AdminLoginInput, type AdminLoginResponse, useAdminLogin } from "./useAdminLogin";

const mocks = vi.hoisted(() => ({
  loginPost: vi.fn<(input: { json: AdminLoginInput }) => Promise<Response>>(),
}));

vi.mock("@tanstack/vue-query", () => ({
  useMutation: (options: {
    mutationFn: (input: AdminLoginInput) => Promise<AdminLoginResponse>;
  }) => ({
    mutateAsync: options.mutationFn,
  }),
}));

vi.mock("@/lib/admin-rpc", () => ({
  adminClient: {
    api: {
      auth: {
        admin: {
          login: {
            $post: mocks.loginPost,
          },
        },
      },
    },
  },
}));

describe("Admin login query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("uses the configured fallback when a failed response is not JSON", async () => {
    mocks.loginPost.mockResolvedValue(
      new Response("<html>Bad Gateway</html>", {
        status: 502,
        headers: { "Content-Type": "text/html" },
      }),
    );
    const mutation = useAdminLogin({
      failureMessage: "BI 登录失败，请检查 code。",
    });

    await expect(
      mutation.mutateAsync({
        userId: "00000000-0000-0000-0000-000000000002",
        password: "analytics-code",
      }),
    ).rejects.toThrow("BI 登录失败，请检查 code。");
    expect(mocks.loginPost).toHaveBeenCalledWith({
      json: {
        userId: "00000000-0000-0000-0000-000000000002",
        password: "analytics-code",
      },
    });
  });
});
