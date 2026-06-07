# Rollout

## CI Validation Gates

Hosted PR validation is split by gate owner:

- backend gate: `.github/workflows/backend-gate.yml`; backend typecheck, backend unit tests, DB artifact lint, and backend scenario tests
- frontend gate: `.github/workflows/frontend-gate.yml`; frontend unit tests, frontend build, and frontend-owned static quality checks
- E2E gate: `.github/workflows/e2e-gate.yml`; root-owned system scenario tests through `pnpm test:scenario:system`

Backend and frontend gates run for PRs targeting `develop` or `master` when
their owned surfaces or workspace install inputs change.

E2E gate runs for PRs targeting `master`. It is also available through
`workflow_dispatch` for release qualification and diagnosis. The E2E gate uses
GitHub Actions Postgres service state via `SCENARIO_DATABASE_ADMIN_URL`,
installs Chromium through Playwright, and lets the system scenario Vitest project start the
Vite frontend server, backend HTTP server, and isolated temporary database.

## Backend CI/CD Flow

Primary workflow: `.github/workflows/backend-fc-deploy.yml`

The workflow prepares the GitHub runner and delegates deploy control flow to
`scripts/ci/fc/deploy_backend.sh`. The script is the canonical executable
rollout path for backend FC deployment.

Runner toolchain versions are explicit: Node is read from `.node-version`,
pnpm is read from the root `packageManager`, and Serverless Devs is pinned in
`scripts/ci/fc/common.sh`. GitHub Action majors are kept on Node24-compatible
releases while project commands run on Node 22.

The backend deploy workflow is triggered by backend source changes and by root
workspace/toolchain inputs used during install, build, or layer packaging:
`.node-version`, `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml`.

### Standard deploy path

1. checkout
2. install workspace dependencies
3. lint backend migration/seed artifacts
4. build FC migration bundle
5. deploy FC migration function
6. invoke migration function
7. prepare or publish backend `node_modules` layer when needed
8. resolve latest layer ARN
9. build backend
10. package backend function payload
11. inject `BACKEND_COMMIT_HASH` from `GITHUB_SHA`
12. deploy backend FC function
13. on `master`, publish function version and update `production` alias
14. on `master`, create the backend GitHub Release after production alias
    publication succeeds

## Rollout Guarantees

- migrations happen before backend deploy
- backend deploys run serially through the `backend-fc-deploy` concurrency group
- layer-only publish is supported via workflow dispatch input
- runtime build metadata stays available even when the deployed package has no `.git` directory
- backend GitHub Releases are gated by successful production deployment

## Release Automation

Primary workflow: `.github/workflows/release-please.yml`

Release Please owns automated version bumps, changelog updates, release tags,
and GitHub Release notes after the `0.3.0` bootstrap baseline.

Tracked release units:

- backend: `apps/backend/package.json`, `apps/backend/CHANGELOG.md`,
  `backend-vX.Y.Z`
- frontend: `apps/frontend/package.json`, `apps/frontend/CHANGELOG.md`,
  `frontend-vX.Y.Z`

The shared manifest is `.release-please-manifest.json`.

Backend and frontend GitHub Release semantics are deployment-gated:

- Backend Release Please PRs update source release metadata, but backend GitHub
  Releases are skipped in the general release workflow. The backend deployment
  workflow creates the backend GitHub Release only after the `master`
  production rollout finishes successfully.
- Frontend Release Please PRs update source release metadata, but frontend
  GitHub Releases are skipped in the general release workflow. The frontend
  deployment workflow creates the frontend GitHub Release only after the
  `master` production ESA rollout finishes successfully.

If release PR checks must run when opened by automation, configure
`RELEASE_PLEASE_TOKEN` as a GitHub PAT or GitHub App token with repository
contents, pull request, and issue-label permissions. Without that secret, the
workflow falls back to `GITHUB_TOKEN`.

## DB Artifact Validation

PR validation workflow: `.github/workflows/backend-db-validate.yml`

This workflow:

1. installs dependencies
2. runs `pnpm --filter @partner-up-dev/backend db:lint`
3. regenerates Drizzle SQL artifacts
4. fails on artifact drift under `apps/backend/drizzle` and `apps/backend/drizzle/meta`

## Job Runner Trigger Rollout

Separate workflow: `.github/workflows/job-runner-trigger-fc-deploy.yml`

This deploys the trigger function that calls the backend job tick endpoint on
cron expression `CRON_TZ=Asia/Shanghai 0 0/30 8-23 ? * ?`.

The workflow delegates deployment to
`scripts/ci/fc/deploy_job_runner_trigger.sh`.

## Frontend ESA CI/CD Flow

Current frontend deployment target is Aliyun ESA.

Primary workflow: `.github/workflows/frontend-esa-deploy.yml`

The workflow prepares the GitHub runner and delegates deploy control flow to
`scripts/ci/esa/deploy_frontend.sh`. The script is the canonical executable
rollout path for frontend ESA deployment.

Repo-tracked rollout facts:

- deploy descriptor: `apps/frontend/esa.jsonc`
- hosted install command: `pnpm install --frozen-lockfile`
- hosted validation: frontend design-token lint, frontend unit tests, and
  frontend build
- build command: `pnpm --filter @partner-up-dev/frontend build`
- published assets directory: `./dist`
- not found strategy: SPA fallback

The frontend deploy workflow is triggered by frontend source changes, backend
source changes that may affect frontend RPC types, and root workspace/toolchain
inputs used during install or build.

### Standard deploy path

1. checkout
2. install workspace dependencies
3. validate required deployment environment
4. lint frontend design tokens
5. run frontend unit tests
6. build frontend static assets
7. authenticate `esa-cli` with ESA access key credentials
8. deploy `apps/frontend/dist` to Aliyun ESA with the branch-selected
   environment
9. on `master`, create the frontend GitHub Release after production ESA
   deployment succeeds

### Environment behavior

- `develop` deploys to ESA `staging`
- `master` deploys to ESA `production`
- deploys run serially through the `frontend-esa-deploy` concurrency group
- `VITE_API_URL` is supplied by the GitHub Environment variable of the same
  name
- `VITE_TENCENT_LBS_JS_KEY` is supplied by the GitHub Environment secret of the
  same name
- `VITE_FRONTEND_COMMIT_HASH` is injected from `GITHUB_SHA`
- ESA credentials are supplied through GitHub Environment secrets
  `ALIBABA_CLOUD_ACCESS_KEY_ID` and `ALIBABA_CLOUD_ACCESS_KEY_SECRET`; the
  frontend ESA deploy script maps them to the ESA CLI credential environment
  names before invoking `esa-cli`

Frontend GitHub Releases are gated by successful `master` production ESA
deployment. The general Release Please workflow creates frontend release PRs
and updates frontend source release metadata, but it skips frontend GitHub
Release creation. The frontend deploy workflow creates the frontend GitHub
Release after production ESA deployment succeeds.

## Manual Rollout Reality

Manual backend deployment is supported through the same repository scripts used
by GitHub Actions. GitHub Actions remains the canonical hosted rollout path.

If manual deploy is used:

- migration function deployment/invocation must still happen before backend app deploy
- layer publishing and latest layer ARN resolution must remain consistent with the FC function deploy
