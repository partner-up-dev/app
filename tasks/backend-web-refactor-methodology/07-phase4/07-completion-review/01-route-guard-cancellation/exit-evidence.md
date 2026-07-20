# Route Guard Cancellation Exit Evidence

- `beforeEach` advances one shared navigation epoch before `beforeResolve` can begin a route-entry login decision.
- The guard captures that epoch and, after bootstrap, returns inert when a newer navigation has started. It writes no
  attempted-route state and calls no OAuth login helper in that branch.
- The normal `/bills` anonymous-WeChat path retains its existing bootstrap, handoff, metadata, and OAuth single-flight
  behavior; only the superseded-navigation branch changes.
- The reusable owner rule is promoted to the Web architecture and OAuth Unit TDD after focused/full proof.
