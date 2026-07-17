# Slice 04 Mental Rehearsal

## Subtask Preflight Matrix

| Subtask | Information to have in hand | Main fork / surprise | Cheapest sufficient proof |
| --- | --- | --- | --- |
| 04A public contract | consumer/field inventory + current/snapshot classification | one projection is either leaky or insufficient | contract review + focused projection tests |
| 04B read migration | consumer families, transaction needs, query counts | set read becomes N+1 or fallback semantics differ | one-family diff + target tests + query-count comparison |
| 04C mutation owner | Admin auth/workflow/write/side-effect path | Admin composition and policy ownership are conflated | Admin scenario proves delegation and unchanged HTTP behavior |
| 04D policy timing | creation snapshots + later edit semantics | current and materialized policy disagree | paired tests before/after config edit on old/new PRs |

## Expected Dependency Change

```text
Before: Discovery / Authoring / PR / Admin -> PRTypeConfigRepository
After:  consumers -> PR Type Config public query/command -> internal repository
```

## Branches And Decisions

- **One projection cannot serve all callers:** create named projections/queries, not a raw row escape hatch.
- **A read needs viewer/tenant context:** make context explicit input; avoid global mutable singleton state.
- **Batch screens regress into N+1:** add a batch read contract or retain the previous set-based query until the
  public owner can express it.
- **Current versus snapshot semantics conflict:** stop and route to system authority/Product TDD; never choose by convenience.
- **Admin write has additional workflow concerns:** keep Admin application composition but delegate validation/write
  to the config owner.
- **Consumer tests mock repository paths:** migrate test language toward the public contract gradually; do not use
  mass mock rewrites as proof of behavior.

## Likely Surprises

- Feedback template, POI/meeting point and route application dependencies can create cycles.
- Repository row types may have leaked into contracts and tests.
- Missing-config fallbacks differ by Discovery/Lifecycle use case.
- Creation materialization and current participation policies intentionally read config at different times.

## Rollback / Forward-fix

- Migrate one consumer family at a time so it can return to the repository without reverting other owners.
- Extend the public projection when evidence shows a stable missing field; do not reintroduce direct reads.
- No DB rollback. Any schema need opens a separate forward-only migration packet.
