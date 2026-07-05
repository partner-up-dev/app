# Environments

`docs/40-deployment/` owns runtime environment truth. This file is a router for
environment families that change for different reasons.

## Runtime Owners

| Runtime family | Owner doc | What it owns |
| --- | --- | --- |
| Local development | [local-development.md](./local-development.md) | portless app identity, local provider fakes, LAN debugging, local-only env fallbacks |
| Backend FC runtime | [backend-runtime.md](./backend-runtime.md) | backend FC runtime, migration function, job-runner trigger, backend env contract, DB environment model |
| Frontend ESA runtime | [frontend-runtime.md](./frontend-runtime.md) | ESA project/environment mapping, frontend deploy env, hosted asset runtime |
| Provider callback edge | [provider-edge-routing.md](./provider-edge-routing.md) | CaoCao callback edge routing and provider callback isolation constraints |

## Branch Environment Split

### `develop`

- GitHub Environment: `staging`
- backend FC behavior: deploy to function `LATEST`
- frontend ESA behavior: deploy to the staging GitHub Environment's ESA project
- migrations run before backend deploy

### `master`

- GitHub Environment: `production`
- backend FC behavior: deploy to `LATEST`, then publish immutable function
  version, then update the `production` alias
- frontend ESA behavior: deploy to the production GitHub Environment's ESA
  project
- migrations run before backend deploy
- backend and frontend GitHub Releases are created only after their production
  deployment workflows succeed

## Runtime Truth Rules

- Workflow files and Serverless/ESA templates are evidence anchors for actual
  hosted runtime behavior.
- Docs may explain intended environment values, but they must label intended
  values separately from workflow fallbacks.
- Local-only variables must not be described as deployed FC runtime variables
  unless the FC template passes them.
- Staging and production database recovery remains forward-only. Local reset
  commands do not imply hosted recovery options.
