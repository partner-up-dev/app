# 4-4 Execution Plan

1. Add the narrow RPC response-report port and process-owned response claim/fallback. Convert the shared auth policy
   into pure response classification; wire the process only at `AppRoot`.
2. Extend pending storage and dispatcher without widening it into generic command retry. Preserve legacy valid records
   and add the waitlist preference field.
3. Update PR command adapters so the durable write precedes escalation claim. Thread only the waitlist boolean needed
   to resume its gate; retain all existing non-replay commands as fallback-only.
4. Add focused timing/protocol tests before exercising the browser journey.
5. Build the mocked system journey from the actual Backend OAuth mock/handoff seam. If the scenario harness cannot
   faithfully carry its browser cookie path, stop at the strongest honest lower-level proof and record the limitation.
6. Run targeted suites, then root type/lint/build and diff hygiene. Promote only the three stable contract clauses
   named in the durable-doc plan.
