# Frontend Runtime

The frontend is deployed to Aliyun ESA.

Evidence anchors:

- workflow: `.github/workflows/frontend-esa-deploy.yml`
- deploy script: `scripts/ci/esa/deploy_frontend.sh`
- deploy descriptor: `apps/frontend/esa.jsonc`

## Current Runtime Facts

- deployment target: Aliyun ESA
- frontend builds to `apps/frontend/dist`
- canonical hosted deploy workflow: `.github/workflows/frontend-esa-deploy.yml`
- canonical executable deploy path: `scripts/ci/esa/deploy_frontend.sh`
- backend runtime depends on `FRONTEND_URL` for share link generation
- WeChat OAuth callback defaults to the backend `/api/wechat/oauth/callback`
  URL inferred from the OAuth start request and forwarded public host/protocol
  headers

## GitHub Environment Contract

Required GitHub Environment secrets:

- `ALIBABA_CLOUD_ACCESS_KEY_ID`
- `ALIBABA_CLOUD_ACCESS_KEY_SECRET`
- `VITE_TENCENT_LBS_JS_KEY`

Required GitHub Environment variables:

- `VITE_API_URL`

Optional or defaulted GitHub Environment variables:

- `ALIYUN_ESA_PROJECT_NAME`: defaults to `partner-up-mvp-ha` in the workflow
  when absent, but each hosted environment should set its own project

Workflow-supplied runtime values:

- `ALIYUN_ESA_ENVIRONMENT`: `production`
- `ALIYUN_ESA_DEPLOY_DESCRIPTION`: `github:${{ github.sha }}`
- `VITE_FRONTEND_COMMIT_HASH`: `${{ github.sha }}`
- `NODE_AUTH_TOKEN`: `secrets.NODE_AUTH_TOKEN || github.token`

## Environment Isolation

Frontend deploys map `develop` to the GitHub `staging` environment and
`master` to the GitHub `production` environment. Each GitHub Environment should
point `ALIYUN_ESA_PROJECT_NAME` at its own ESA project. The deploy script always
publishes to ESA environment `production` inside the selected project.

Frontend environment isolation is implemented by separate ESA projects, not by
ESA's `staging` environment inside one project.

## Hosted Asset Runtime

Repo-tracked deploy descriptor:

```text
apps/frontend/esa.jsonc
```

Current descriptor facts:

- install command in descriptor: `pnpm install`
- workflow install command: `pnpm install --frozen-lockfile`
- build command in descriptor: `pnpm run --filter frontend build`
- workflow build command: `pnpm --filter @partner-up-dev/frontend build`
- published assets directory: `./dist`
- not found strategy: SPA fallback

The workflow and deploy script are the canonical hosted deployment path. The ESA
descriptor remains the repo-tracked project descriptor, but workflow/script
behavior is the source for CI rollout behavior.
