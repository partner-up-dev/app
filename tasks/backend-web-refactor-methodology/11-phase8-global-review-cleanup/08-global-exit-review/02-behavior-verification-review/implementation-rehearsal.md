# `8-7.2` Implementation Rehearsal

Run focused failure repair only when a gate identifies a Phase 8 regression.
An unrelated protected-worktree or environment failure is isolated and
reported; it is not silently absorbed. Record suite counts from final
successful runs, not intermediate slice boundaries.
