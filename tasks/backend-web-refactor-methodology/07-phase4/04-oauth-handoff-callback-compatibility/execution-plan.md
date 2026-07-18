# 4-3 Execution Plan

1. Read the exact handoff response path, global error serializer, callback branch helper, and focused test helpers.
   Select the smallest stable response vocabulary that does not break the legacy direct JSON consumer.
2. Add Backend proof first for the expected rejected identity and one-shot cookie outcome. Implement only the
   response/marker ordering needed to satisfy that proof.
3. Change the Web handoff client from a boolean result to a typed outcome. The gate maps received 4xx/malformed
   success bodies to terminal recovery, and fetch/5xx uncertainty to retryable recovery. Keep credentials included.
4. Make the login process normalize returnTo at its single construction boundary. Make direct callback failures
   clear pending state and remove code/state from the address bar without exposing raw credentials or redirecting
   through a new topology.
5. Run focused Backend and Web proof, then static/type/build gates proportional to the touched paths. Inspect the
   diff for accidental CORS, callback-origin, cookie-attribute, provider, or unrelated 4-2 changes.
6. Promote only the verified failure/recovery rule to the OAuth handoff Unit TDD. Record unobserved provider/edge
   facts as a remaining external closure item.

## Execution Result

Steps 1–6 are complete for the local semantic slice. The focused Backend and Web proof, type/lint/build checks,
and durable promotion agree on the terminal-versus-transport-uncertainty rule. The explicit 4-3.4 topology gap is
retained rather than being treated as a failed local test.

## Stop Branches

- If a stable response would require changing the provider callback URL, CORS, cookie flags, or frontend origin,
  stop local implementation and obtain the 4-3.4 evidence.
- If the direct callback response has an external consumer with a stricter contract, retain it and add an adapter
  rather than changing the navigation contract to match it.
- If a Browser scenario only passes through a same-origin proxy, record it as local plumbing proof rather than
  cross-origin deployment proof.
- If the desired UI needs a new product choice beyond fresh-login versus visitor continuation, stop and request a
  product decision.
