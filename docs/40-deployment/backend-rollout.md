# Backend Rollout

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
workspace/toolchain inputs used during backend filtered install, build, or layer
packaging: `.node-version`, `package.json`, `pnpm-lock.yaml`, and
`pnpm-workspace.yaml`. It does not trigger on `.npmrc` changes and does not
require GitHub Packages read permissions because frontend-only private packages
are outside the backend install graph.

## Standard Backend Deploy Path

1. checkout
2. install backend dependency graph with
   `pnpm --filter @partner-up-dev/backend... install --frozen-lockfile`
3. lint backend migration/seed artifacts
4. build FC migration bundle
5. deploy FC migration function
6. invoke migration function with `PARTNERUP_ENVIRONMENT` mapped from branch
   (`develop` -> `staging`, `master` -> `production`)
7. prepare or publish backend `node_modules` layer when needed
8. resolve latest layer ARN
9. build backend
10. package backend function payload
11. inject `BACKEND_COMMIT_HASH` from `GITHUB_SHA`
12. deploy backend FC function
13. on `master`, publish function version and update `production` alias

## Rollout Guarantees

- migrations happen before backend deploy
- backend migration environment is explicit in deploy and is not inferred by
  the migration runner
- backend deploys run serially through the `backend-fc-deploy` concurrency group
- layer-only publish is supported via workflow dispatch input
- runtime build metadata stays available even when the deployed package has no
  `.git` directory
- backend GitHub Releases are source code version archives owned by Release
  Please, not by the backend deploy workflow

## Job Runner Trigger Rollout

Separate workflow: `.github/workflows/job-runner-trigger-fc-deploy.yml`

This deploys the trigger function that calls backend maintenance tick endpoints.
The workflow delegates deployment to
`scripts/ci/fc/deploy_job_runner_trigger.sh`.

Cron deployment truth is documented in [backend-runtime.md](./backend-runtime.md).
The current workflow fallback for `ALIYUN_FC_JOB_RUNNER_TRIGGER_CRON` is
`0 */30 * * * *`; business-hour cadence requires a GitHub Environment override.

On `master`, the job-runner trigger deploy script publishes a function version
and updates the production alias after template deployment succeeds.
