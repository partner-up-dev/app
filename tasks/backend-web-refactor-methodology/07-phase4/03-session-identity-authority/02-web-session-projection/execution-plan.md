# 4-2.2 Execution Plan

1. Narrow public session role parsing to anonymous/authenticated and decouple the admin store's local role type.
2. Remove the unused public Pinia token projection so rotated headers cannot diverge from reactive state.
3. Extract the register-or-restore decision into a process-local, testable coordinator.
4. Adapt the Vue composable to typed RPC calls and preserve callback/handoff deferral.
5. Prove fresh registration, valid restoration, 401 clear-and-register recovery, and non-401 non-loop behavior.

## Result

All five steps completed. The coordinator is deliberately injection-based rather than an RPC wrapper test, while the
composable keeps callback/handoff deferral and maps the real RPC calls onto that boundary.
