# 4-4.3 Execution Plan

For each named 401 response: parse once, persist exact intent, then claim escalation with its `Response`. Preserve
existing UI continuation behavior. Thread the waitlist opt-in only to its resumed gate. Inventory intentional
fallback-only protected commands in the packet and tests.
