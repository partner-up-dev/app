# Slice 3-6 — Web Contract Surface Narrowing

## Objective & Hypothesis

Keep Hono `AppType` as the typed HTTP origin while reducing arbitrary Web imports from the Backend root export.
Stable shared value types move behind a types-only contract subpath; response/input aliases remain inferred near
their domain adapters. No handwritten DTO package or runtime client abstraction is introduced.

## Entry / Exit

- Entry: Backend domain public surfaces and compatibility cutovers are stable; current Web type-import inventory complete.
- Exit: raw `AppType` import is transport-owned, selected value types use a narrow types-only surface, handwritten
  response duplicates are removed, Web type/build/System pass and compile-time dependency direction improves.

## Status

Planned last in the current sequence. No mutation started.
