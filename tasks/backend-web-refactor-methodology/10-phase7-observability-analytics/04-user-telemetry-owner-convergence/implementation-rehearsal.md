# `7-3` Implementation Rehearsal

## Expected Sequence

1. Inventory every emitter against the Backend Registry.
2. Add or verify the type-only projection.
3. Convert one event family end-to-end, then mechanically converge remaining
   aliases under the same contract test.
4. Separate collector/context from queue/transport without changing
   activation behavior.
5. Split accepted, deterministic-rejected and retryable transport/storage
   outcomes.
6. Contain backend-confirmed recording failure.
7. Delete obsolete aliases and escape hatches after zero-reference proof.

## Preflight Facts

- Web currently has 43 direct calls across 20 files and 31 used snake-case
  aliases; four unused aliases may disappear from the Web input surface
  without deleting their Backend Registry contracts.
- The first Web event lazily creates a journey and emits
  `journey.started -> route.entered (for page entry) -> behavior event`.
- The in-memory queue is capped at 1,000, takes batches of 50, normally
  flushes after 2 seconds and retries after 5 seconds.
- Five Backend-confirmed PR event calls occur after business-command commit;
  the common recorder is therefore the deepest place to contain telemetry
  failure.
- Current ingest `ON CONFLICT DO NOTHING` needs explicit idempotent accounting.

## Branches

- If Web type consumption creates a runtime cycle, adjust declaration/build
  exports; never import Backend runtime schemas.
- If an event lacks a stable payload, preserve the explicit gap rather than
  invent fields.
- If durable telemetry delivery is requested, stop for a separate atomicity
  design; do not imply a generic outbox.
- If consent behavior is ambiguous, preserve it exactly.
- If failure needs operational visibility, add it to the future O11y
  requirements rather than restoring legacy output.
- If Backend and Web worker changes temporarily fail cross-workspace typing,
  wait for both halves before changing the public contract shape.
- If queue requeue would exceed the cap, preserve the older failed batch and
  evict newer tail events; never allow retry to violate the bound.

## Stop Conditions

- Business logic depends on telemetry acceptance.
- A second canonical Registry or version constant appears.
- Collection policy changes implicitly.
- Unknown payload is cast instead of boundary-validated.
