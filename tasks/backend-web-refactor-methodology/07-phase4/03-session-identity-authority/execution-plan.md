# 4-2 Execution Plan

1. Implement and prove the User-domain public identity projection plus the public auth transport boundary.
2. Re-run the established anonymous UUID backend scenario to detect compatibility regression before Web mutation.
3. Narrow Web public session storage/store types; extract the process decision from Vue wiring; add focused process
   tests and adapt the bootstrap exactly once.
4. Add one Browser-to-Backend scenario for UUID recovery and stale UUID replacement.
5. Run changed-file formatting, focused tests, relevant type/lint/build gates, then inspect the diff and protected
   paths.
6. Promote only the compact proven cross-unit session rule; leave callback/handoff and operator revalidation as
   named compatibility windows.

No schema migration, deployment setting, provider-console edit, broad scenario sweep, or unrelated toolchain
validation belongs to this plan.

## Recorded Outcome

The implementation followed this order. Backend proof established persisted active/public-role authority before the
Web change; the extracted Web coordinator then proved fresh, restore, 401-recovery and non-401 branches before the
Browser-to-Backend scenario. The scenario initially exposed a root-workspace dependency leak in test setup; it was
fixed by a backend test-infrastructure action, then re-run as one file. No stop branch was taken.
