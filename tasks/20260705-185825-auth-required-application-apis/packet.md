# Objective & Hypothesis

Fix POI location application and anchor-event route application APIs so unauthenticated callers start the shared WeChat OAuth login flow after a 401.

Evidence:

- Frontend RPC auth policy only starts OAuth for `401` responses carrying `code: "AUTHENTICATED_REQUIRED"`.
- Durable contracts define `AUTHENTICATED_REQUIRED` as the error for commands requiring the product `authenticated` role.
- `poi.controller.ts` and `anchor-event.controller.ts` currently use local `requireSessionUserId` helpers that only require `auth.userId` and throw a generic 401 without the stable code.
- Both application pages call query and submit APIs through the shared Hono RPC client, so coded 401 responses should be enough for global redirect handling.

Likely cause:

- The application API auth guard is weaker and less specific than the product contract: anonymous sessions may pass, while no-session failures do not carry the OAuth-triggering code.

# Guardrails Touched

- Backend controller auth boundary for POI application list/submit.
- Backend controller auth boundary for anchor-event route application list/submit.
- Cross-unit Problem Details auth-required contract.

Protected invariants:

- Public POI lookup endpoints remain public/session-tolerant.
- Public anchor-event read endpoints remain unchanged.
- OAuth callback, handoff cookie, and access-token transport are not changed.

# Verification

Planned recurrence guard:

- Add focused backend tests proving the four application endpoints return `401` with `code: "AUTHENTICATED_REQUIRED"` for anonymous/no bearer calls.
- Run the focused tests and a relevant type/lint slice if needed.

Executed:

- `pnpm exec vitest run --config vitest.backend.config.ts --project backend-unit apps/backend/src/controllers/application-auth.test.ts`
- `pnpm check:type:backend`
- `pnpm check:lint:backend`
