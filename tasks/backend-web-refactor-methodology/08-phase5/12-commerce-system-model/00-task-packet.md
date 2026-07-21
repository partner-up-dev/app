# C0 — Commerce System Model Gate

## Status

**Complete as the Phase 5 source-mutation gate.** C0 is not a new implementation phase or a replacement for `5-2`.
It existed because static owner/import topology did not capture temporal SSoT, cache/read-model, and vocabulary
failures discovered in the RideHailing MVP. Its resulting slices are now complete or explicitly deferred; any future
Commerce mutation must re-enter through a focused packet rather than treating C0's historical sequence as a live
queue.

## Objective

Build one compact, evidence-backed system model for the Commerce/RideHailing loop. For each material fact, identify:

1. authoritative writer and durable storage;
2. legal command or observation trigger;
3. reader/projection/cache and its non-authoritative status;
4. vocabulary used across PRD, TDD, backend, provider, and Web;
5. concurrency, response-loss, and duplicate-fetch behavior at the boundary.

The model must make it possible to derive slices from a lifecycle rather than from an individual file or import.

## Subtasks

- [`01-ride-lifecycle/`](./01-ride-lifecycle/) models provider creation, observation, final settlement, payment, and
  cancellation as one temporal system.
- [`02-web-read-model/`](./02-web-read-model/) characterizes query keys, cache authority, invalidation, polling, and
  list projections.
- [`03-vocabulary-authority/`](./03-vocabulary-authority/) reconciles terms that currently name more than one fact.
- [`04-phase-rebase/`](./04-phase-rebase/) translates the model into bounded Phase 5 workstreams and exit gates.
- [`05-execution-gates/`](./05-execution-gates/) records the few remaining Sir decisions and the external-evidence
  prerequisite for a genuine Phase exit.

## Non-Goals

- no source, schema, provider-console, or durable-document mutation;
- no global event bus, generic outbox, or generic cache wrapper;
- no cosmetic split of `useCommerce.ts`, pages, or components;
- no claim that a request pattern is a defect without static or network-count evidence.

## C0 Exit Gate

The gate was satisfied before `5-2` resumed: the four subtasks agreed on the Order/CreateOrderAttempt boundary;
Quote and provider-ID vocabulary; the query-versus-reconciliation shape for Ride detail; confirmed versus
hypothesized Web read issues; and the resulting workstream map. Durable docs were promoted only after later
source/scenario proof. The remaining `dispatchBinding` source-versus-durable conflict stays an explicit future
characterization/promotion item, not a claim that this gate is still awaiting source work.
