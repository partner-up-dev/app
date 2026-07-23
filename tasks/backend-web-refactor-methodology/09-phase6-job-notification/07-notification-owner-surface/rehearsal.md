# `6-2` Mental Rehearsal

## Expected Branches

1. **Promotion is still valid.** The handler renders from the current promoted
   slot and sends through the bound channel; limited credit is consumed under
   existing provider semantics.
2. **Promotion became stale.** Eligibility returns false and the handler returns
   `SKIPPED`; no provider call occurs and Job records only generic completion.
3. **User has unlimited future-channel credit.** The future persistence adapter
   maps null to the domain `UNLIMITED`; arithmetic is impossible on the ADT.
   Current WeChat rows always map to `LIMITED`.
4. **WeChat credit is exhausted or preference disabled.** The handler skips
   before rendering/provider I/O.
5. **Provider returns `43101`.** Notification applies the option cleanup and
   returns a non-retryable generic disposition.
6. **Provider proves non-application and safe repetition.** Notification returns
   `RETRYABLE_FAILURE` and JobRunner owns retry timing.
7. **Network/HTTP/parse outcome is ambiguous.** The handler does not invent a
   Job `UNKNOWN`, does not auto-retry, and returns a bounded non-retrying
   failure. No durable Notification uncertainty entity is invented solely for
   attempt history.
8. **Old waitlist Job is pending during deployment.** Its legacy definition
   remains registered or decodes into the new handler; rollout does not turn it
   into unknown work.
9. **Another notification family still uses concrete scheduler code.** It
   remains explicitly compatibility-only and is not half-migrated in this
   slice.
10. **Promotion commits and scheduling fails.** The exemplar exposes the
    current lost-handoff debt; `6-2` does not call this reliable. `6-3` must make
    the family atomic or add a named reconstruction fact.

## Likely Traps

- Treating current uppercase Notification kind as the public business template.
- Letting callers choose provider template IDs or compute private dedupe keys.
- Moving scheduling/credit logic into the WeChat adapter.
- Reusing per-kind handler glue behind a nominal generic facade.
- Running full eligibility/render preparation both before scheduling and again
  in the handler.
- Treating current non-null WeChat counters as if nullable unlimited credit were
  already persisted.
- Calling every current `TRANSPORT_ERROR` retry-safe.
- Duplicating attempt telemetry in handler and JobRunner.
- Calling PR repositories from Notification instead of an injected curated
  query adapter.
