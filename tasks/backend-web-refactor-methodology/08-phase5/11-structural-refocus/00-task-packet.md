# Phase 5 Structural Refocus

## Status

**Expanded by the System Model Gate; no runtime mutation authorised by this packet.** This packet corrects the
Phase boundary after the `5-0`/`5-1` topology evidence, completed `5-3` Bill–Payment cut, Sir's Rental clean-cut-off
decision, and the RideHailing unknown-create UX decision. The later `C0` evidence establishes that static topology
is only one lens: it cannot by itself expose a side-effecting read, cache-as-authority divergence, or vocabulary
collision.

## Problem Statement

The old Phase map mixed three different kinds of work: owner-surface convergence, behavior necessary to make a
boundary safe, and unresolved product/operations debt. It also treated static import topology as if it were the
whole system. That made a collection of defect fixes look like the Phase goal. The goal is instead to reduce active
Commerce owner span and exposed dependencies **while making fact authority, temporal triggers, read/cache
projections, and vocabulary unambiguous**.

## Controlling Rule

For every remaining mutation, ask two questions in this order:

1. Does it replace a demonstrated cross-owner implementation dependency with a Command, canonical Query, stable
   Contract, or Port—or retire a false active owner?
2. If it is a correctness change, is it the minimum protection against duplicated/reverted cross-owner facts or
   duplicate external side effects created by that boundary?

Only a `yes` to the first, or a `yes` to the second in service of the first, belongs in the Phase core. Before this
test, the change must also name the fact's writer, interaction trigger, read/cache projection, and vocabulary. The
detailed classification is in [`classification.md`](./classification.md); C0 owns the corresponding model evidence.

## Outputs

- [`target-metrics.md`](./target-metrics.md): measurable structural exit claims and explicit non-metrics.
- [`slice-sequence.md`](./slice-sequence.md): dependency-respecting sequence and deferred work.
- [`rehearsal.md`](./rehearsal.md): pre-execution failure branches that prevent the slices from growing sideways.
- [`../12-commerce-system-model/`](../12-commerce-system-model/): the mandatory lifecycle, read-model, and
  vocabulary gate preceding the next source mutation.

## Durable-Docs Rule

This is task-local planning evidence. Promote product retirement only after runtime proof, topology facts only after
consumer cutover, and runtime edge facts only after staging observation. Do not modify the architectural objectives
document: it already contains the higher-order rule this Phase is applying.
