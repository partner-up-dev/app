# Execution plan

1. Add an injected `usePRCreateAuthGate` and shared disclosure component.
2. Gate all four create command owners before mutation; preserve authenticated command behavior.
3. Remove structured Save Draft UI/copy and the `PR_DISCOVERY_CREATE` write/read/replay path.
4. Add focused gate/pending-action tests and update the targeted browser scenario.
5. Run focused Web tests, typecheck/build, then record exit evidence.
