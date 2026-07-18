# Execution plan

1. Add and unit-test a pure policy accepting only `{status, createdBy}`, `{userId, roles}`, and one operation.
2. Wire canonical read seams before projections/child lookups and mutation seams before side effects or creator claim.
3. Preserve OPEN+ behavior and dedicated admin/raw readers; do not touch failed-create transaction architecture.
4. Run focused policy unit, backend type/build checks, and `git diff --check` only.

## Low-cost validation

The policy unit has no database or HTTP setup. Type/build catches signature propagation and bundle reachability; diff
check catches accidental whitespace. Scenario and full-system proof are owned by the later proof task.
