# `6-3.2b-2` Plan

1. **Complete:** added exact and prefix Job writer/store operations. Exact-key
   advisory locking fences each release; a prefix is only a stable enumeration
   of keys, not a false promise to lock future source work.
2. **Complete:** added Notification semantic aggregate/recipient invalidation,
   private PR-message key construction and a transaction-bound invalidation
   port. Job sees only `jobType` plus opaque creation identity.
3. **Complete:** added locked PR-message option read/write APIs and the named
   preference/credit mutation. The source and mutation share the recipient
   option-row lock, and generic `43101` cleanup uses that mutation.
4. **Complete:** proved pending/running/terminal release behavior, private-key
   mapping, no historical replay, and a real-Postgres source-vs-clear lock
   race. See [`verification-log.md`](./verification-log.md).
