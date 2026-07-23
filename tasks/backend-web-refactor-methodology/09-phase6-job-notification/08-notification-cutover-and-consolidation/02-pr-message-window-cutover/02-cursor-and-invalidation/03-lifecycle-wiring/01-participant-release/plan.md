# `6-3.2b-3.1` Plan

1. **Complete:** identified the four actual removal transactions.
2. **Complete:** added the smallest PR-owned `{ prId, recipientUserId }`
   exact hand-off to the transaction-bound Notification port.
3. **Complete:** routed self exit, admin release, temporal release and
   content-conflict release without merging their validation/audit flows.
4. **Complete:** added focused real-Postgres proof for self/admin removal,
   recipient precision, rejoin no-replay, and hand-off rollback; retained the
   content-conflict regression.
5. **Complete for this new release path:** it imports no Job/private key. The
   broader pre-existing source writer leak is explicitly owned by `6-3.1h`,
   not hidden as an exception.
