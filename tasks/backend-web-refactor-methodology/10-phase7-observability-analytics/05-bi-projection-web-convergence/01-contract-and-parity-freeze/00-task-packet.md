# `7-4A` — Contract And Parity Freeze

## Status

**Complete on 2026-07-23.** Pure Discovery-model fixtures cover the six
steps, duplicate events, missing dimensions, half-open boundaries, conversion
above 100%, filters, and dictionary output. Web contract tests preserve query
paths, inactive-query behavior, route assembly, and the existing semantic
test-ID set.

## Objective

Turn the current BI behavior into an executable compatibility boundary before
changing storage readers or Web ownership.

## Concrete Work

1. Record the four response DTO shapes and current default/filter behavior.
2. Add PR Discovery model characterization for:
   - six-step ordering;
   - distinct journeys versus event counts;
   - duplicate events;
   - missing dimensions;
   - half-open range boundaries;
   - conversion above 100%;
   - event dictionary output.
3. Freeze Create/Join/Retention formulas touched by later query work.
4. Add controller characterization for the current inconsistent date errors so
   the intended 4xx change is explicit.
5. Freeze Web route names/paths/roles, query keys, enabled conditions,
   filters, loading/error/empty/refresh states and stable test IDs.
6. Freeze `/bi?code=...` login/redirect/code-scrub behavior.
7. Build one reusable controlled telemetry fixture for `7-4B`/`7-4E`.

## Outputs

- focused characterization tests;
- response/formula compatibility matrix in the task packet;
- reusable event/context fixture;
- exact list of approved behavior changes versus preserved behavior.

## Exit

`7-4A` closes when a future reader/page implementation can be compared against
the frozen behavior without relying on visual inspection or production data.

See [`rehearsal.md`](./rehearsal.md).
