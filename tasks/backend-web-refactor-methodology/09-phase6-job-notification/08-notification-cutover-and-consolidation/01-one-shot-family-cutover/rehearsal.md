# `6-3.1` Mental Rehearsal

- A recoverable reminder schedule fails after mutation: the named reconciler
  derives the same semantic key/times and recreates it without duplication.
- An atomic-required task insert fails: its owning transition rolls back; no
  log-only “recovery” is accepted.
- Meeting point changes twice quickly: current “each change notifies” semantics
  retains two causation keys; switching to latest-only would require product
  approval.
- A waitlist-alternative query observes stale temporal state: the curated port
  computes/reads current facts without invoking a PR command.
- An old Job remains pending after caller cutover: its concrete definition stays
  registered and no second new-format Job is manufactured.
- A controller bind/unbind flow rebuilds schedules: it reaches the same public
  Notification surface as domain callers rather than an orphan concrete helper.
