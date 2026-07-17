# Slice 03 Mental Rehearsal

## Subtask Preflight Matrix

| Subtask | Information to have in hand | Main fork / surprise | Cheapest sufficient proof |
| --- | --- | --- | --- |
| 03A characterize | schema, conditional rules, unique key, current tests | opening-only journey is mistaken for submission proof | real POST System step + isolated DB probe |
| 03B deepen Backend | controller/use-case/repository responsibilities | validation needs schema or status change | focused unit + Backend scenario; stop on migration/API need |
| 03C separate Web | form events, mutation payload, Problem Details, invalidation | 401/replay exposes sensitive-draft policy gap | Web unit proves local retry and command contains no `prId` |
| 03D full journey | scenario env/lifecycle + canonical PR projection | UI success and persisted state diverge | targeted System, DB row, refreshed canonical detail, then full System |

## Expected Sequence

```text
PR canonical detail says questionnaire=PENDING
  -> user opens modal and edits local answers
  -> feedback workflow calls typed mutation
  -> POST /api/feedback/:instanceId
  -> Backend validates definition snapshot and upserts response
  -> Web invalidates PR detail
  -> canonical detail reports SUBMITTED
```

## Branches And Decisions

- **401 occurs:** preserve current global OAuth behavior but do not add answer replay/localStorage in this slice.
  The user may need to reopen; a privacy-aware replay protocol requires a separate contract decision.
- **Upload succeeds but submission fails:** keep the URL in local draft for retry. There is no current delete/orphan
  contract, so do not invent cleanup.
- **Backend validation and Web form disagree:** Backend wins; add/adjust frontend guidance without duplicating the
  full rule engine unless a shared stable schema already owns it.
- **Response state does not refresh:** diagnose query invalidation and canonical projection before adding optimistic state.
- **A migration appears necessary:** stop and open a migration-ledger slice; this pilot must not hide schema work.

## Likely Surprises

- Current Web error parsing looks for `{error}` while Backend emits Problem Details `detail`.
- Conditional questions and image uploads can race with submit/cancel.
- The existing System journey proves opening only; passing it does not prove submission.
- Design-web `PuButton`, `PuModal` or `PuFileUpload` contracts may affect real submit semantics. Load the local
  design-web skill and the specific component reference before edits.

## Rollback / Forward-fix

- Restore the previous mutation/UI wiring while retaining characterization and System proof.
- Use `detail ?? error ?? fallback` during compatibility; remove legacy fallback only with evidence.
- Upsert data is non-destructive and test DB isolated; no hosted data rollback is part of this slice.
