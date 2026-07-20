import { beforeEach, describe, expect, test, vi } from "vitest";
import { handleWeChatAuthRequiredError } from "./auth-error";
import { requestWeChatOAuthLogin } from "@/processes/wechat/oauth-login";
import { claimAuthenticatedRequiredResponse } from "@/processes/auth/authenticated-escalation";

vi.mock("@/processes/wechat/oauth-login", () => ({
  redirectToWeChatOAuthBind: vi.fn<(returnTo: string) => Promise<void>>(),
  requestWeChatOAuthLogin: vi.fn<(returnTo: string) => boolean>(() => true),
}));

vi.mock("@/processes/auth/authenticated-escalation", () => ({
  claimAuthenticatedRequiredResponse: vi.fn<(response: Response, returnTo: string) => boolean>(
    () => true,
  ),
}));

const requestLoginMock = vi.mocked(requestWeChatOAuthLogin);
const claimResponseMock = vi.mocked(claimAuthenticatedRequiredResponse);

describe("WeChat auth error compatibility", () => {
  beforeEach(() => {
    requestLoginMock.mockClear();
    claimResponseMock.mockClear();
  });

  test("keeps the legacy three-argument OAuth path", () => {
    expect(
      handleWeChatAuthRequiredError(
        401,
        { code: "AUTHENTICATED_REQUIRED" },
        "https://partner-up.test/pr/1",
      ),
    ).toBe(true);
    expect(requestLoginMock).toHaveBeenCalledWith("https://partner-up.test/pr/1");
    expect(claimResponseMock).not.toHaveBeenCalled();
  });

  test("claims the exact response when the command supplies it", () => {
    const response = new Response(null, { status: 401 });
    expect(
      handleWeChatAuthRequiredError(
        401,
        { code: "AUTHENTICATED_REQUIRED" },
        "https://partner-up.test/pr/1",
        response,
      ),
    ).toBe(true);
    expect(claimResponseMock).toHaveBeenCalledWith(response, "https://partner-up.test/pr/1");
    expect(requestLoginMock).not.toHaveBeenCalled();
  });
});
