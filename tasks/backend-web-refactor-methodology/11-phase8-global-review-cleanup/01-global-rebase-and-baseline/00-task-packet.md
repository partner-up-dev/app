# `8-0` — Global Rebase And Evidence Baseline

## Status

**Complete on 2026-07-23.** Read-only source/durable/runtime-contract
exploration and task-local evidence maintenance were the only authorized
actions.

## Unknowns

1. What is the current Backend/Web dependency and public-surface topology after
   Phases 3–7?
2. Which remaining edges represent real owner-span or SSoT defects rather than
   ratified exceptions?
3. Which compatibility surfaces and state are live, expired, inert or merely
   historical prose?
4. Which known Commerce read/performance findings are measured enough to enter
   Phase 8?
5. Which report-first dead-code/security findings have a clear owner and cheap
   proof?
6. Which Phase 4/5 external evidence procedures remain executable after the
   Phase 7 clean-baseline retirement?
7. Which task/durable claims conflict with `HEAD` or Git provenance?

## Outputs

- [current topology and scorecard](./current-and-target-scorecard.md);
- [Backend structural audit](./backend-structural-baseline.md);
- [Web structural audit](./web-structural-baseline.md);
- [cross-unit/control-plane audit](./cross-unit-control-plane-audit.md);
- [compatibility/conflict register](./conflict-and-disposition-register.md);
- [candidate slice map with explicit exclusions](./candidate-slice-map.md);
- [verification log](./verification-log.md); and
- [reproducible commands](./reproducible-commands.md) and the task-local
  dependency-SCC helper.

## Exit Result

The global baseline separates active owner/dependency defects from named
compatibility, external evidence, future programs, product decisions,
unmeasured performance hypotheses and independent tooling. `8-1`–`8-7` now
have proposed poly-file packets, but none inherited source authorization from
`8-0`.

## Non-goals

- source fixes;
- dependency or directory movement;
- formatting;
- migration/schema cleanup;
- external probes;
- production/provider configuration;
- product-policy decisions;
- professional observability implementation; and
- committing or pushing.
