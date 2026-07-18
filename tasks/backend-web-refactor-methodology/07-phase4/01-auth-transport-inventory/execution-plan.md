# 4-0 Execution Plan

1. Freeze the entry SHA and protected dirty paths in the root Phase 4 packet.
2. Map Backend session/JWT/user/callback authority without editing source; classify each import/call as public
   contract, internal implementation, controller adapter, or legacy facade.
3. Map Web RPC, storage, bootstrap, route auto-login, OAuth handoff, telemetry/share guarding and pending-action
   edges; distinguish runtime edges from type-only or constants-only edges.
4. Trace four public-user journeys end-to-end: anonymous revisit, authenticated bootstrap/rotation, OAuth callback
   handoff, and an authenticated-required command with domain-owned pending replay.
5. Run only evidence-discriminating focused tests. Escalate to a targeted System journey only if source/durable
   evidence leaves a continuity ordering question unresolved.
6. Reconcile maps into candidate Phase 4 slices. Move to `Solidify` only when the next implementation boundary is
   explicit; otherwise retain open questions and stop.
