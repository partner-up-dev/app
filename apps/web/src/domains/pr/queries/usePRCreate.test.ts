import { describe, expect, test } from "vitest";
import { i18n } from "@/locales/i18n";
import { readPRCreateErrorMessage } from "./usePRCreate";

describe("PR creation error mapping", () => {
  test("maps disabled PR types to PR type copy", async () => {
    const response = Response.json(
      { code: "PR_TYPE_USER_CREATION_DISABLED", detail: "backend detail" },
      { status: 403 },
    );

    await expect(readPRCreateErrorMessage(response, "fallback")).resolves.toBe(
      i18n.global.t("errors.prTypeUserCreationDisabled"),
    );
  });
});
