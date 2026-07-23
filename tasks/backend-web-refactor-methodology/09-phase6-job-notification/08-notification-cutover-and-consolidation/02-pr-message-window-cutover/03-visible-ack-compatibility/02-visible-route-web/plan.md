# `6-3.2c-2` Plan

1. Add `useAcknowledgePRMessageAttention` to the PR query transport, inferred
   from the new Hono route.
2. Add a PR-domain use case that owns browser visibility and cursor retry
   orchestration; inject its acknowledgement callback so happy-dom tests do
   not require a live RPC client.
3. Replace `PRMessageThread`'s query-success read-marker watcher with an
   opt-in to that use case. Default is disabled.
4. Opt in only from `PRMessagesPage`, adding a stable semantic thread marker
   for the system scenario.
5. Add happy-dom proofs for hidden data, post-render visible ACK, and a failed
   same-cursor retry; do not introduce a component-test dependency.
