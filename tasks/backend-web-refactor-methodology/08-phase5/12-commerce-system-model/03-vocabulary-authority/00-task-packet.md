# C0.3 — Vocabulary And Authority Reconciliation

## Objective

Make the Commerce vocabulary one-to-one with business facts where callers cross PRD, TDD, provider, backend, and
Web boundaries. This is an obscurity/SSoT concern, not a naming-style sweep.

## Rule

A term merits migration only when different layers use it for different authoritative facts, allowing an incorrect
decision, cache, provider call, or user-visible state to be inferred. Old wire/type aliases may remain temporarily;
the semantic contract must not remain ambiguous.

See [`conflict-matrix.md`](./conflict-matrix.md) and [`promotion-plan.md`](./promotion-plan.md).
