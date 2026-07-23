import { describe, expect, it } from "vitest";
import { collectTelemetryContextEvent } from "./collector";

describe("telemetry collector context boundary", () => {
  it("retains the typed auth identity context while behavior sanitization stays separate", () => {
    const collected = collectTelemetryContextEvent("auth.session.created", {
      session_role: "authenticated",
      anonymous_id: "anonymous-1",
      authenticated_user_hash: "user-hash-1",
    });

    expect(collected.envelopes.at(-1)?.payload).toEqual({
      session_role: "authenticated",
      anonymous_id: "anonymous-1",
      authenticated_user_hash: "user-hash-1",
    });
  });
});
