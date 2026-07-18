# 07E.1 Execution Plan

1. Freeze the final test inventory and inspect the public LLM/share read chain. Add only a mocked-provider controller
   test if that chain lacks executable short-circuit proof.
2. Run cheap focused Backend unit tests (creation guard, WeCom, DRAFT policy and any new LLM test), then the focused
   Web unit set. These prove the individual negative boundaries before a database/browser run.
3. Run the final Backend PR scenario matrix: creation, DRAFT, join-gate, admin and public-route cases.
4. Run the targeted System PR-create file, which includes Browser A zero-POST/cancel retention and authenticated
   normal creation. It runs foreground without an outer launcher-only timeout.
5. Run Backend/Web type and build gates, then the repository full scenario gate, architecture-fitness delta, format
   diff check, and a final scope audit.
6. Record current command output/counts. Mark 07A–07D, 07E, CF-01 and Phase-3 root status only when every required
   claim is supported; otherwise leave the owning slice open.

## Verification Matrix

| Claim | Cheapest proof | Final corroboration |
| --- | --- | --- |
| USER creation is authenticated before write | `create-pr-structured` unit + create scenario | full Backend/System scenario |
| WeCom cannot manufacture an identity | WeCom controller unit | full Backend scenario |
| DRAFT rows are opaque except for their authenticated owner | policy unit + DRAFT/join-gate/admin/route scenarios | full Backend/System scenario |
| Public LLM/share cannot disclose a DRAFT or call provider | policy unit + mocked-provider controller test + share scenario | source/scope audit |
| Browser A has no pre-auth create/replay | gate/pending-action units + targeted System | full System scenario |
| no boundary/compile regression | Backend/Web type/build, fitness delta, diff check | full scenario gate |
