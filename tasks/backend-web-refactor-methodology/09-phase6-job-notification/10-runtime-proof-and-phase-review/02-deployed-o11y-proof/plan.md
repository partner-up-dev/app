# `6-5.2` Execution Plan

1. Obtain staging FC/SLS/operator authority and record actual trigger cadence,
   runtime overrides, retention and alert owners without exposing secrets.
2. Enable the protected staging-only Job-owned no-I/O probe with a bounded
   disposition mode; reject arbitrary payload/code and production use.
3. Generate/correlate success, skip, retryable, permanent, missed and slow-
   success lease-fencing evidence through real wake-up paths.
4. Prove SLS queries by Job/type/version/attempt, retention, alert thresholds,
   PII redaction and recovery runbooks.
5. Compare already-occurring Notification attempt signals with compatibility
   delivery rows without creating a provider send.
6. Record every unavailable branch as external pending and keep deliveries.

Stop if proof requires provider/business mutation, unbounded debug execution,
raw payload logging or assumptions about environment configuration.
