# `8-6.2` — PR Preview And Share Endpoint Owners

## Status

**Complete on 2026-07-24.** Focused source/behavior proof is closed; root
integration owns full Web/type/build/System gates.

## Objective & Hypothesis

Eliminate the PR primitive/query and Share workflow/RPC reversals without
making callers duplicate canonical PR projections or transport contracts.

## Guardrails Touched

- The id-based PR preview remains a deep UI interface backed by TanStack Query.
  Its query-owning wrapper moves to `ui/composites`; the existing frame remains
  a pure primitive.
- Existing props, action slot, route target, events and semantic test ids stay
  stable.
- Share fallback/error behavior and scope-staleness checks remain unchanged.
- Share request types remain Hono-client inferred.

## Verification

- focused PR preview route/render tests;
- focused Share adapter mapping/error tests;
- source audit for `ui/primitives -> queries` and Share use-case raw RPC;
- Web type/unit/build and relevant System journeys at integration.

See [`verification-log.md`](./verification-log.md).
