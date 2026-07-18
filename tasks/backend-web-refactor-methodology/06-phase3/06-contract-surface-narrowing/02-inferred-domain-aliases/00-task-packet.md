# 06B — Inferred Domain Aliases

## Objective

Keep Hono client inference at Web transport/domain adapter boundaries and expose domain-owned request/response
aliases to models, use-cases and UI. Remove genuinely duplicate handwritten HTTP shapes without moving raw client
mechanics into the model or inventing a shared DTO package.

## Owned Surface

- Web domain adapter/contract modules that derive aliases with `InferRequestType` or `InferResponseType` from the
  typed Hono client.
- The minimum query-module exports and model/use-case/UI type imports needed for one selected pilot family.
- Temporary type-only compatibility facades only when they have an exact consumer list and removal condition.

Backend package exports, Backend root retirement and multi-family migration are outside 06B.

## Entry Information

- 06A's package subpath must resolve in Backend/Web type and build checks.
- Refresh the inventory of handwritten request/response shapes and Web model/UI imports from query modules or
  `lib/rpc`; classify each as HTTP contract alias, UI/view model or intentional local input.
- Select Feedback and PR Discovery as the first candidates only when their current adapter inference points and
  focused tests are identified. Freeze exact owned files and consumers before editing.
- Record the current dependency direction around `lib/rpc`, query adapters, model, use-cases and UI so the delta can
  prove that client mechanics remain inward-facing.

## Fork / Stop Conditions

- If Hono inference creates a type cycle, keep an adapter-local alias or a temporary type-only facade with a named
  removal gate; do not copy the response shape.
- If a handwritten shape is a real UI/view model rather than a duplicate wire contract, retain and name it.
- If route inference exposes a Backend response change, stop and treat it as a cross-unit contract change with
  Backend ownership and behavior tests, not as a cast or alias cleanup.
- If the pilot needs a universal client wrapper, broad `useApi` abstraction or runtime package dependency, stop; that
  changes the architecture rather than narrowing a type surface.

## Low-cost Verification

- Focused `rg` probes show the selected model/use-case/UI files no longer type-import from query modules or
  `lib/rpc`, while raw client access remains in transport/adapters.
- Type-level checks prove aliases are inferred from the route and no duplicate response interface was introduced.
- Run the selected family's Web unit tests and `pnpm check:type:web`; add `pnpm check:build:web` after the pilot
  batch. A type-only import move does not require System by itself.
- Compare the focused import graph before/after and record any temporary facade with consumers and removal gate.

## Status

Complete on 2026-07-17. Both bounded pilots preserve transport ownership and have independent evidence:

1. [`01-feedback-adapter-pilot/`](./01-feedback-adapter-pilot/entry-inventory.md) moves Feedback values to the
   package contracts entry and derives command aliases at its Hono adapter.
2. [`02-pr-discovery-adapter-pilot/`](./02-pr-discovery-adapter-pilot/00-task-packet.md) moves PR model inference
   to the PR domain contract owner while retaining query type facades for unmodified UI consumers.

Broader value-type consumer migration and root compatibility retirement remain 06C/06D work.
