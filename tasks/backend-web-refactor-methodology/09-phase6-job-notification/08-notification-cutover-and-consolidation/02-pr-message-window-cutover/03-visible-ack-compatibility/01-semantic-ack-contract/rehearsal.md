# `6-3.2c-1` Rehearsal

- The incoming cursor is a PR stream identity, so it must be positive and
  belong to this PR even when `deletedAt` is present. It need not equal the
  currently latest cursor: stale acknowledgement is a valid no-release result.
- Current participant validation happens before Notification mapping. A
  concurrent exit/terminal/delete may release first; a later ACK becomes a
  harmless no-op and must never reopen work.
- The creation-key lock makes source scheduling versus ACK order safe. The PR
  use case must not add its own generic Job lock or reconstruct a key.
- The external route returns `ok` on both covered and stale control outcomes;
  transport/validation failure is the only failure that the Web retry policy
  handles.
