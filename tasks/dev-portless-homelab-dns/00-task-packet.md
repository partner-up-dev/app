# Dev Portless Homelab DNS

## Objective & Hypothesis

Objective: improve the local dev-server ensure workflow so PartnerUp dev routes
can run under a configurable homelab DNS suffix such as
`partner-up.d.home.arpa`, with app-specific hosts:

- frontend: `web-app.partner-up.d.home.arpa`
- backend: `api.partner-up.d.home.arpa`
- CaoCao fake provider: `caocao.partner-up.d.home.arpa`
- WeChatPay fake provider: `wechatpay.partner-up.d.home.arpa`

Hypothesis:

- `scripts/ensure-dev-servers.mjs` should own route readiness and post-readiness
  DNS registration because it knows the selected routes and final URLs.
- `scripts/portless.mjs` should remain a thin portless wrapper, but it should
  pass configurable TLD/LAN settings consistently to portless.
- The repo should not hard-code homelab-specific values such as the Technitium
  URL, DNS zone, API token, or developer machine IP.
- WSL-local host resolution should be optionally supported so in-WSL backend
  calls to local fake-provider routes can resolve `partner-up.d.home.arpa` to
  `127.0.0.1` instead of routing out through homelab DNS.

## Input Classification

- Type: `Constraint`
- Active mode: `Solidify`, then `Execute` only after the user explicitly starts
  implementation.
- Durable owner after verification: `docs/40-deployment/local-development.md`
- Cross-unit contract owner if app identities affect frontend/backend coupling:
  `docs/20-product-tdd/cross-unit-contracts.md`

## Guardrails Touched

- Root workflow:
  - `AGENTS.md`
  - `docs/00-meta/bootstrap-workflow.md`
  - `docs/00-meta/input-constraint.md`
  - `docs/00-meta/mode-b-solidify.md`
  - `docs/00-meta/mode-c-execute.md`
- Local development runtime:
  - `docs/40-deployment/environments.md`
  - `docs/40-deployment/local-development.md`
- Candidate code/config surfaces:
  - `package.json`
  - `portless.json`
  - `scripts/portless.mjs`
  - `scripts/ensure-dev-servers.mjs`
  - `.vscode/tasks.json`
  - `.vscode/launch.json`
  - `apps/frontend/vite.config.ts`

## Working Decisions

- Change portless app names to produce the desired homelab hostnames:
  - `partner-up` -> `web-app`
  - `api.partner-up` -> `api`
  - `caocao.partner-up` -> `caocao`
  - `wechatpay.partner-up` -> `wechatpay`
- Use `PORTLESS_DOMAIN_BASE=partner-up.d.home` with `PORTLESS_TLD=arpa` or
  `--tld arpa` for the homelab suffix. `PORTLESS_TLD` must remain a single
  portless-valid label.
- Keep local-only default behavior environment-neutral. Technitium integration
  and WSL hosts writes must be opt-in.
- Prefer explicit DNS target IP from `--dns-ip` / `DEV_DNS_TARGET_IP`; otherwise
  reuse `--ip` / `PORTLESS_LAN_IP` when LAN mode is enabled.
- Use Technitium API token auth through `Authorization: Bearer <token>`.
- Use idempotent A-record writes with Technitium `overwrite=true`.
- Do not create a branch unless the user explicitly asks.
- Implementation started after explicit user approval.

## Candidate Configuration Contract

CLI and environment inputs:

- `--tld <suffix>` / `PORTLESS_TLD`
- `PORTLESS_DOMAIN_BASE`
- `--dns-provider technitium` / `DEV_DNS_PROVIDER=technitium`
- `--dns-ip <ipv4>` / `DEV_DNS_TARGET_IP`
- `DEV_DNS_ZONE`
- `DEV_DNS_TTL`
- `DEV_DNS_STRICT=1`
- `TECHNITIUM_API_URL`
- `TECHNITIUM_API_TOKEN`
- `DEV_HOSTS_SYNC=1`
- `DEV_HOSTS_IP=127.0.0.1`

Example target command:

```bash
TECHNITIUM_API_URL=http://192.168.3.156:5380 \
TECHNITIUM_API_TOKEN=... \
DEV_DNS_PROVIDER=technitium \
DEV_DNS_ZONE=partner-up.d.home.arpa \
PORTLESS_DOMAIN_BASE=partner-up.d.home \
PORTLESS_TLD=arpa \
DEV_HOSTS_SYNC=1 \
pnpm dev:ensure --ip <reachable-lan-ip>
```

## Candidate Work Breakdown

1. Update route identity:
   - Change root portless scripts and `portless.json` app names to
     `web-app`, `api`, `caocao`, and `wechatpay`.
   - Update frontend portless sibling-host derivation from `web-app` to `api`.
2. Make TLD handling explicit:
   - Add `--tld` parsing in `ensure-dev-servers.mjs`.
   - Ensure spawned `scripts/portless.mjs` processes receive the selected TLD.
   - Stop forcing `.local` merely because `--lan` is set when an explicit TLD is
     provided.
3. Add Technitium DNS registration:
   - Add post-readiness A-record upsert for selected route hostnames.
   - Validate required config only when DNS provider is enabled.
   - Support strict and warning-only modes.
4. Add optional WSL hosts sync:
   - Add a managed hosts block for `partner-up.d.home.arpa` and route hosts.
   - Default target should be `127.0.0.1`.
   - Keep it opt-in and bounded to local development.
   - Provide a separate minimal-privilege hosts-sync command/task so `/etc/hosts`
     writes do not require running the whole dev server as root.
5. Update durable docs:
   - Promote the verified local development command and configuration contract
     to `docs/40-deployment/local-development.md`.
   - Update cross-unit contract text if the frontend/backend portless names
     change from current documented examples.
6. Update VS Code task and launch profiles:
   - Replace old launch URLs such as `https://partner-up.localhost` and
     `https://partner-up.local` with the new frontend route model:
     `https://web-app.<PORTLESS_DOMAIN_BASE>.<PORTLESS_TLD>` when a domain base
     is configured.
   - Ensure LAN/homelab tasks pass the same TLD, LAN IP, state dir, DNS provider
     config, and optional hosts-sync config used by the shell workflow.
   - Update backend LAN debug launch env so direct backend debugging registers
     the `api.<PORTLESS_DOMAIN_BASE>.<PORTLESS_TLD>` route when a domain base
     is configured, rather than the old `api.partner-up.*` route.
   - Remove hard-coded machine IPs from committed VS Code profiles where a
     variable/input/env-based alternative is practical.
   - Keep a normal localhost VS Code launch path for developers who do not use
     homelab DNS.

## Verification

Static checks:

- `node --check tasks/dev-portless-homelab-dns/technitium-dns-smoke.mjs`
- `node --check scripts/portless.mjs`
- `node --check scripts/ensure-dev-servers.mjs`
- `pnpm exec biome check scripts/portless.mjs scripts/ensure-dev-servers.mjs apps/frontend/vite.config.ts`

Task-local DNS smoke test:

- Task-local smoke can read process environment variables. Secrets should not be
  kept in `tasks/dev-portless-homelab-dns/.env`; for VS Code workflows, keep
  homelab DNS secrets in ignored `.vscode` task/launch configuration.
- Dry-run command:
  `node tasks/dev-portless-homelab-dns/technitium-dns-smoke.mjs`
- Apply command:
  `node tasks/dev-portless-homelab-dns/technitium-dns-smoke.mjs --apply`
- The smoke script upserts A records with `overwrite=true`, then reads the
  records back through Technitium to verify the configured target IP.

Observed result:

- `node --check tasks/dev-portless-homelab-dns/technitium-dns-smoke.mjs`
  passed.
- Dry run computed the expected route hosts under
  `partner-up.d.home.arpa`.
- `node tasks/dev-portless-homelab-dns/technitium-dns-smoke.mjs --apply`
  successfully upserted and verified:
  - `web-app.partner-up.d.home.arpa -> 172.16.249.14`
  - `api.partner-up.d.home.arpa -> 172.16.249.14`
  - `caocao.partner-up.d.home.arpa -> 172.16.249.14`
  - `wechatpay.partner-up.d.home.arpa -> 172.16.249.14`

Behavior checks:

- Default local mode still resolves to stable local routes without DNS provider
  config.
- Homelab mode computes:
  - `https://web-app.partner-up.d.home.arpa`
  - `https://api.partner-up.d.home.arpa`
  - optional fake-provider routes under the same suffix.
- With DNS provider enabled, Technitium receives A-record upserts for selected
  route hosts to the configured target IP.
- With hosts sync enabled in WSL, the managed hosts block maps the base suffix
  and selected route hosts to `127.0.0.1`.
- Frontend `/api` proxy derives `api.partner-up.d.home.arpa` from
  `web-app.partner-up.d.home.arpa`.
- VS Code `Frontend`, `Backend`, and compound launch profiles use the same
  route names and TLD contract as the root scripts.

## Open Questions

- Should `DEV_HOSTS_SYNC=1` write only the base suffix plus selected routes, or
  all known PartnerUp dev routes every time?
- Should fake-provider DNS records be registered only when selected/started, or
  always when DNS provider is enabled?
- Should DNS registration happen before or after foreground readiness marker in
  `--foreground` mode?

Resolved during implementation:

- `DEV_HOSTS_SYNC=1` writes the base suffix plus all known PartnerUp dev route
  hosts because `/etc/hosts` has no wildcard support and backend fake-provider
  calls may need provider hosts even when those provider servers are started
  separately.
- DNS registration writes only the selected ready routes from the current
  `dev:ensure` invocation.
- Foreground mode runs DNS and hosts post-readiness hooks before printing
  `DEV_ENSURE_FOREGROUND_READY`, so VS Code launch can rely on the route being
  ready when the background task completes.

## Implementation Notes

- Portless app names changed to `web-app`, `api`, `caocao`, and `wechatpay`.
- `scripts/ensure-dev-servers.mjs` now honors `--tld` / `PORTLESS_TLD` before
  falling back to LAN `.local`, then `.localhost`.
- Custom TLD homelab mode does not pass portless LAN mode through because
  portless LAN forces `.local`; `--ip` is still accepted as the DNS target IP.
- Technitium registration is opt-in via `DEV_DNS_PROVIDER=technitium` or
  `--dns-provider technitium`.
- Hosts sync is opt-in via `DEV_HOSTS_SYNC=1`.
- `/etc/hosts` writes can be run separately through `pnpm dev:hosts:sync` or the
  VS Code hosts-sync task; the separate path does not carry Technitium secrets
  or start dev servers.
- VS Code task/launch profiles were updated in the ignored `.vscode/` workspace
  directory; those edits are local workspace configuration, not tracked git
  changes.
- Per explicit user direction, the development-only baseline migrations `0077`
  and `0081` directly update local provider endpoints from old portless names
  to the new route identity; no `0086` forward migration is kept.

## Verification Results

- `node --check scripts/ensure-dev-servers.mjs` passed.
- `node --check scripts/portless.mjs` passed.
- `node --check tasks/dev-portless-homelab-dns/technitium-dns-smoke.mjs`
  passed.
- `.vscode/tasks.json`, `.vscode/launch.json`, `package.json`, and
  `portless.json` parse as valid JSON.
- `pnpm exec biome check ...` passed for the touched source/config/doc files.
- `pnpm check:type:backend` passed.
- `pnpm check:type:frontend` passed.
- `pnpm check:config:backend` passed.
- Focused backend unit test passed:
  `pnpm exec vitest run --config vitest.backend.config.ts --project backend-unit apps/backend/src/domains/payment/services/payment-provider.test.ts`
- Focused frontend unit test passed:
  `pnpm exec vitest run --project frontend-unit apps/frontend/src/shared/wechat/fake-wechatpay-bridge.test.ts`
- Task-local Technitium apply passed and verified:
  - `web-app.partner-up.d.home.arpa -> 172.16.249.14`
  - `api.partner-up.d.home.arpa -> 172.16.249.14`
  - `caocao.partner-up.d.home.arpa -> 172.16.249.14`
  - `wechatpay.partner-up.d.home.arpa -> 172.16.249.14`
- A bounded `dev:ensure` smoke with `--timeout-seconds 1` reached the new
  `https://web-app.partner-up.d.home.arpa` route expectation and timed out
  before route registration; no active route or leftover dev-server process was
  present afterward.
