import assert from "node:assert/strict";
import { test } from "vitest";
import { buildProblemDetailsPayload, ProblemDetailsError } from "./problem-details";

const buildTestProblem = () =>
  new ProblemDetailsError({
    status: 400,
    type: "https://partner-up.app/problems/test",
    localizedText: {
      zhCN: {
        title: "中文标题",
        detail: "中文详情",
      },
      enUS: {
        title: "English title",
        detail: "English detail",
      },
    },
  });

test("ProblemDetails prefers zh when Accept-Language ranks zh above en", () => {
  const { payload, contentLanguage } = buildProblemDetailsPayload(
    buildTestProblem(),
    "zh-CN,zh;q=0.9,en;q=0.8",
  );

  assert.equal(contentLanguage, "zh-CN");
  assert.equal(payload.title, "中文标题");
});

test("ProblemDetails resolves en when Accept-Language prefers en", () => {
  const { payload, contentLanguage } = buildProblemDetailsPayload(
    buildTestProblem(),
    "zh-CN;q=0.6,en-US;q=0.9",
  );

  assert.equal(contentLanguage, "en-US");
  assert.equal(payload.title, "English title");
});
