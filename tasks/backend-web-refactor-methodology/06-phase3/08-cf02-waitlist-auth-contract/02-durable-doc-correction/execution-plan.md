# 08B Execution Plan

1. Read 08A's trace report and freeze only the durable lines it proves stale.
2. Re-read the nearest authoritative PR lifecycle and shared auth-transport wording. Decide whether one line or one
   directly linked cross-reference must change for a coherent contract.
3. Apply the smallest wording correction: waitlist JSON body is the refreshed public PR; optional session rotation is
   `x-access-token`; no auth/session fields occur in that body.
4. Search the frozen durable scope for old `auth payload`/body-auth claims and review the focused diff.
5. Record promotion evidence and hand the exact proof expectation to 08C. Do not alter runtime types, Hono code,
   Web session handling, or API versioning.

This plan is conditional on 08A proving runtime alignment.
