# Frontend Rollout

## Frontend ESA CI/CD Flow

Current frontend deployment target is Aliyun ESA.

Primary workflow: `.github/workflows/frontend-esa-deploy.yml`

The workflow prepares the GitHub runner and delegates deploy control flow to
`scripts/ci/esa/deploy_frontend.sh`. The script is the canonical executable
rollout path for frontend ESA deployment.

Repo-tracked rollout facts:

- deploy descriptor: `apps/web/esa.jsonc`
- hosted install command: `pnpm install --frozen-lockfile`
- hosted package registry auth: `NODE_AUTH_TOKEN` for GitHub Packages reads,
  including `@partner-up-dev/design-web`
- hosted validation: frontend design-token lint, frontend unit tests, and
  frontend build
- build command: `pnpm --filter @partner-up-dev/web build`
- published assets directory: `./dist`
- not found strategy: SPA fallback

The frontend deploy workflow is triggered by frontend source changes, backend
source changes that may affect frontend RPC types, and root workspace/toolchain
inputs used during install or build.

## Standard Deploy Path

1. checkout
2. install workspace dependencies
3. validate required deployment environment
4. lint frontend design tokens
5. run frontend unit tests
6. build frontend static assets
7. map Aliyun access key credentials to `esa-cli` environment credential names
8. deploy `apps/web/dist` to the GitHub Environment-selected Aliyun ESA
   project and publish it to that project's `production` environment

## Environment Behavior

- `develop` uses the GitHub `staging` environment and its configured ESA
  project
- `master` uses the GitHub `production` environment and its configured ESA
  project
- each ESA project deploy publishes to ESA environment `production`
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
- `esa-cli@1.0.10 login` is not used as a deploy preflight in hosted CI. In env
  credential mode, it validates credentials but does not persist a durable login
  state. The deploy command performs its own login probe, and the script retries
  only the known transient `Maybe you are not logged in yet.` probe failure.
- frontend environment isolation is implemented by separate ESA projects, not
  by ESA's `staging` environment inside one project

Frontend GitHub Releases are source code version archives owned by Release
Please. The frontend deploy workflow does not create GitHub Releases.

## Design Package Deployment Boundary

Deployment docs only own the hosted install/auth requirement for private
frontend packages. Component API, visual foundation, package skill usage, and
package update procedure belong to frontend-local guidance and the
`@partner-up-dev/design-web#design-web` skill, not deployment rollout.
