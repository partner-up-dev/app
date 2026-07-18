import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { ProblemDetailsError } from "../lib/problem-details";

const { getPRSpy, generateXiaohongshuCaptionSpy } = vi.hoisted(() => ({
  getPRSpy: vi.fn<(prId: number) => Promise<never>>(),
  generateXiaohongshuCaptionSpy:
    vi.fn<(...args: unknown[]) => Promise<{ caption: string; posterStylePrompt: string }>>(),
}));

vi.mock("../domains/pr/queries", () => ({
  getPR: getPRSpy,
}));

vi.mock("../services/ShareAIService", () => ({
  ShareAIService: class {
    generateXiaohongshuCaption = generateXiaohongshuCaptionSpy;
  },
}));

const { llmRoute } = await import("./llm.controller");

test("inaccessible PR short-circuits Xiaohongshu caption generation", async () => {
  getPRSpy.mockRejectedValueOnce(
    new ProblemDetailsError({
      status: 404,
      type: "https://partner-up.app/problems/http.404",
      code: "PR_NOT_ACCESSIBLE",
      localizedText: {
        zhCN: { title: "未找到", detail: "Partner request not found" },
        enUS: { title: "Not Found", detail: "Partner request not found" },
      },
    }),
  );

  const response = await llmRoute.request("http://localhost/xiaohongshu-caption", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prId: 42 }),
  });

  assert.equal(response.status, 500);
  assert.deepEqual(getPRSpy.mock.calls, [[42]]);
  assert.equal(generateXiaohongshuCaptionSpy.mock.calls.length, 0);
});
