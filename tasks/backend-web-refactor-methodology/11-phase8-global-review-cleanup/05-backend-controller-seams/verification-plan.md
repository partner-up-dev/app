# `8-4` Verification Plan

## Per-batch Proof

- Admin POI controller/use-case unit and Backend scenario;
- Auth identity/session unit and System login/session journeys;
- PR create/read/edit/join/message Backend and System scenarios;
- WeChat OAuth handoff/callback, JSSDK, subscription and `/bills` entry
  scenarios.

## Integrated Gates

- structural guard: controllers cannot import repositories;
- architecture fitness with zero controller/repository findings;
- `pnpm check:static`;
- Backend and Web unit suites;
- Backend scenario suite;
- System scenario suite because cookies/redirects/cross-unit identity are in
  scope; and
- Web build/type proof for unchanged Hono inference.
