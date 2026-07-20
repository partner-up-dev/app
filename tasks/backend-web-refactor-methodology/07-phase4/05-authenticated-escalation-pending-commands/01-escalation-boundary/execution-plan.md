# 4-4.1 Execution Plan

Replace direct redirect handling in `authFetch` with a registration callback carrying the actual response and parsed
payload. Keep classification pure. A process coordinator schedules a delayed fallback keyed by that response; a
command can claim it before navigation. Wire only from `AppRoot`, then prove token rotation and single escalation.
