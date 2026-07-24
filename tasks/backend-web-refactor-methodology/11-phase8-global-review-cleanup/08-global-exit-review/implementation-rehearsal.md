# `8-7` Implementation Rehearsal

## Failure Branches

- **Fitness is green but a root barrel exposes internals:** the scorecard and
  public-surface audit take precedence over the reporter count.
- **Tests pass but durable docs claim an unobserved deployment fact:** keep the
  claim external and Phase 8 locally complete only.
- **A retained exception has no exit condition:** either prove it is a durable
  design exception or return it to the owning slice.
- **Full gates expose unrelated protected-worktree failure:** isolate and
  report it; do not absorb independent package/tooling changes.
- **A migration artifact check would mutate files:** run it only in the
  separately authorized controlled boundary.
- **A durable update would merely record transient counts:** keep the count
  task-local.

## Final Review Lenses

- dependency topology;
- classic use-case sequences;
- SSoT/authority;
- compatibility and external truth;
- verification cost and gate trust;
- durable generative guidance; and
- Git/worktree provenance.
