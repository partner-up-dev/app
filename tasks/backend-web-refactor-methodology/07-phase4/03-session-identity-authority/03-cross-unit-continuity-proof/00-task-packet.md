# 4-2.3 — Cross-Unit Public Continuity Proof

## Owned Paths

- `tests/scenario/auth/**` and only the minimum shared scenario helper if a reusable semantic seam is missing;
- this subtask's evidence and verification log.

## Exact Outcome

A real browser first receives an anonymous session, then recovers the same user from UUID-only storage. After that
row becomes invalid, the next UUID-only bootstrap clears it and receives a different fresh anonymous user. The
scenario proves the user-visible Browser-to-Backend contract rather than a mocked implementation detail.

## Completion

Complete. The one focused system scenario passed after its database transition was placed behind reusable backend
test infrastructure. Its exact evidence is in [`verification-log.md`](./verification-log.md) and
[`exit-evidence.md`](./exit-evidence.md).
