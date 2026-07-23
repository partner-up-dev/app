# `6-3.1f-05` Rehearsal

- Lock order is POI first, then the full old/new exact-location PR union in
  ascending ID order. Concurrent PR content/type work either precedes the
  observed set or causes the serializable transaction to retry; source code
  does not take another owner row lock through the resolver.
- A POI point changes but a PR has an explicit, type/location or type default
  point: its visible point does not change and no task is created. A plain POI
  fallback PR does receive the immutable new description.
- A rename observes both old-name and already-new-name PRs before the write.
  After `old -> new`, an old-name POI fallback becomes null and is intentionally
  suppressed because this product has no removal template; a new-name fallback
  can become the updated POI point and is notified. The union is a source
  reach/consistency rule, not a claim that the old PR receives the new point.
- One point update over several fallback PRs shares one UUID/correlation but
  keeps PR-specific causation and recipient-private creation keys. A gallery or
  address-only persisted change with equal effective point creates no task.
- A second handoff failure after a first real generic Job write rolls back the
  POI row and every already-written Job. The controller therefore cannot return
  a changed POI that lacks its source event fan-out.
