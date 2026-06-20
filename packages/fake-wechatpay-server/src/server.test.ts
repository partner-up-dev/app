import { afterEach, describe, expect, test } from "vitest";
import { type StartedFakeWeChatPayServer, startFakeWeChatPayServer } from "./server";

describe("startFakeWeChatPayServer", () => {
  let server: StartedFakeWeChatPayServer | null = null;

  afterEach(async () => {
    await server?.close();
    server = null;
  });

  test("serves health readiness", async () => {
    server = await startFakeWeChatPayServer();

    const response = await fetch(`${server.origin}/health`, {
      method: "HEAD",
    });

    expect(response.ok).toBe(true);
  });
});
