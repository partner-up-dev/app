# `7-0` Read-Only Rehearsal

## Rehearsed Paths

1. Separate repository SLS configuration from external saved SLS state.
2. Separate structured/debug output from CLI/dev/test terminal output.
3. Separate SQL audit-shaped compatibility from log transport.
4. Preserve user telemetry/BI as an independent evidence family.
5. Withdraw the SLS-first target without replacing it through another
   unearned architecture choice.
6. Re-slice the Phase so clean-baseline retirement precedes Analytics
   convergence and future-O11y handoff.

## Failure Modes Caught

- Formalizing historical convenience because the platform is already
  configured.
- Claiming saved SLS queries are absent based only on repository search.
- Treating a global `console.*` purge as architectural cleanup.
- Dropping `notification_deliveries` without replacement proof.
- Smuggling OTel or another vendor into the correction.
- Calling a silent system observability-complete.
