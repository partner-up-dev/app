# `6-5.1b-1` Mental Rehearsal

- Request-tail is called twice while its promise is active: one tick is started,
  the second is a local no-op and the first resets after error/timeout.
- An external tick overlaps request-tail in another process: the local seam does
  not claim global exclusion; existing Job claim/lease proof remains decisive.
- A caller hits diagnostics without a token: it sees the same 401/503 boundary
  as tick and no Job facts.
- A backlog has many job types: output is bounded/counted; it never serializes
  rows, payloads or `lastError` blobs.
- Public `/health` remains a cheap process-local status even when diagnostics
  needs a DB query.
