# 4-1 Proposed Execution Plan

This is a non-executable plan until Sir approves the Impact Handshake and explicitly starts runtime work.

1. Freeze the established environment pairing and preserve current callback/handoff behavior as an explicit
   non-goal.
2. Select one configuration authority for allowed Web return origins and credentialed CORS. It must preserve the
   established production/staging pairs without accepting request-supplied origins as configuration.
3. Make CORS and `returnTo` consume that authority independently; retain explicit local/scenario inputs rather than
   broadening production rules to simplify tests.
4. Add focused negative/positive tests before broad cleanup: paired origin allowed, arbitrary origin rejected,
   hostile return target rejected, nonce handoff semantics retained.
5. Run focused static/type/build and selected System gates proportionate to the changed boundaries.
6. Promote only the proven configuration/return-target facts to durable owners; re-run no-cookie public header probes
   after rollout.

No step is permitted to replace a callback topology, alter a cookie/handoff response, remove the frontend callback
route, or modify a deployment variable in this slice.
