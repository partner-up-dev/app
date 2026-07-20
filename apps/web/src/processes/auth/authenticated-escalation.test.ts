import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  claimAuthenticatedRequiredResponse,
  reportAuthenticatedRequiredResponse,
  resetAuthenticatedEscalationForTest,
} from "./authenticated-escalation";
import { requestWeChatOAuthLogin } from "@/processes/wechat/oauth-login";

vi.mock("@/processes/wechat/oauth-login", () => ({
  requestWeChatOAuthLogin: vi.fn<(returnTo: string) => boolean>(() => true),
}));

const requestLoginMock = vi.mocked(requestWeChatOAuthLogin);
const payload = { code: "AUTHENTICATED_REQUIRED", detail: "Login required" };

const report = (response: Response, returnTo = "https://partner-up.test/pr/1"): void => {
  expect(
    reportAuthenticatedRequiredResponse({
      response,
      payload,
      returnTo,
    }),
  ).toBe(true);
};

describe("authenticated escalation response coordinator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    requestLoginMock.mockClear();
    resetAuthenticatedEscalationForTest();
  });

  afterEach(() => {
    resetAuthenticatedEscalationForTest();
    vi.useRealTimers();
  });

  test("unclaimed recognised response falls back to OAuth once", () => {
    const response = new Response(null, { status: 401 });
    report(response);

    expect(requestLoginMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(0);
    expect(requestLoginMock).toHaveBeenCalledOnce();
    expect(requestLoginMock).toHaveBeenCalledWith("https://partner-up.test/pr/1");
  });

  test("claim cancels the response-bound fallback", () => {
    const response = new Response(null, { status: 401 });
    report(response);

    expect(claimAuthenticatedRequiredResponse(response, "https://partner-up.test/pr/2")).toBe(true);
    vi.advanceTimersByTime(0);

    expect(requestLoginMock).toHaveBeenCalledOnce();
    expect(requestLoginMock).toHaveBeenCalledWith("https://partner-up.test/pr/2");
  });

  test("one response is handled once even when reported and claimed repeatedly", () => {
    const response = new Response(null, { status: 401 });
    report(response);
    report(response);

    expect(claimAuthenticatedRequiredResponse(response, "https://partner-up.test/pr/1")).toBe(true);
    expect(claimAuthenticatedRequiredResponse(response, "https://partner-up.test/pr/1")).toBe(true);
    vi.advanceTimersByTime(0);

    expect(requestLoginMock).toHaveBeenCalledOnce();
  });

  test("unrecognised responses do not schedule escalation", () => {
    const response = new Response(null, { status: 403 });
    expect(
      reportAuthenticatedRequiredResponse({
        response,
        payload,
        returnTo: "https://partner-up.test/pr/1",
      }),
    ).toBe(false);
    vi.advanceTimersByTime(0);
    expect(requestLoginMock).not.toHaveBeenCalled();
  });
});
