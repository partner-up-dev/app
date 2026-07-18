# 4-2.1 Verification Strategy

First run the pure User-query unit test. Then run the new focused backend scenario and the pre-existing
`anonymous_uuid_restores_session` scenario. The scenario must prove a disabled or operator-only row cannot use an
unexpired public bearer, while an active anonymous UUID still restores exactly that user. Finish with backend type,
lint and build checks only after the focused behavior is green.

## Result

The query unit, focused public-session scenario, backend type/lint, and backend build all passed. The focused
scenario extends the pre-existing UUID assertion with persisted role/status transition coverage; see the local
[`verification-log.md`](./verification-log.md).
