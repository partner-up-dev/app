# `6-3.3c` Plan

1. Verify old-client route traffic is within the approved sunset policy and the
   PR-message legacy Job strategy no longer reads inbox state.
2. Archive according to `6-3.3a`, add a forward migration and remove the
   entity/repository/service/route/response fields in one coherent batch.
3. Add API compatibility-removal and thread contract tests; preserve
   acknowledgement cursor/tombstone semantics.
4. Run source zero-reference audit, backend/Web type/lint/build and the visible
   semantic-ACK system scenario.

## Cheapest Credible Verification

Migration fixture for a nonempty old inbox table plus one Web→backend scenario
showing ACK still releases/reopens a window with no read-marker transport.
