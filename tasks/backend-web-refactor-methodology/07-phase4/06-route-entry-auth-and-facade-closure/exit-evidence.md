# 4-5 Exit Evidence

## Local Exit Reached

The following evidence includes the initial 4-5 result and the completed Phase-completion repair. The Backend
facade-retirement evidence remains locally closed.

- The PRD explicitly promises WeChat route-entry OAuth for anonymous `/bills` visitors.
- A single app-bootstrap-installed router guard is the only implementation owner. Route metadata is the only opt-in
  surface; `/bills` is the only current `route` policy, and pages/domain queries have no route-entry redirect
  import.
- Focused proof covers bootstrap, pending handoff, authentication, environment, attempted-route, target return URL,
  navigation stopping, registration, the shared OAuth redirect flight, and delayed bootstrap followed by a newer
  early navigation signal. A stale guard now neither marks attempt state nor starts OAuth.
- `WeChatAuthSessionService` and `WeChatLoginService` are deleted after closed local source/entrypoint/export/
  bundle/dead-code evidence and Backend OAuth regression/type/build proof.
- The exact verified product rule, Web ownership rule, and OAuth guard invariant are promoted to their durable
  owners. The retirement conclusion remains task-local because it does not prove external artifacts absent.
- Full Web unit, focused Backend OAuth tests, root type, Web/Backend lint, Web/Backend build, scoped formatting,
  and diff hygiene are recorded in [verification-log.md](./verification-log.md).

## Explicit Non-Closures

- The 4-1 normal-deployment public-header observation remains external.
- 4-3.4 still owns provider-console, edge, callback, and production-topology evidence.
- The Browser-to-Backend System harness's canonical host/cookie limitation is neither fixed nor reclassified as a
  4-5 failure.
