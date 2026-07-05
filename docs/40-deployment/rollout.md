# Rollout

`docs/40-deployment/` owns hosted rollout truth. This file is a router for
rollout surfaces that have different operators, failure modes, and release
semantics.

## Rollout Owners

| Surface | Owner doc | What it owns |
| --- | --- | --- |
| CI validation gates | [ci-gates.md](./ci-gates.md) | PR validation gate topology and install boundaries |
| Backend FC rollout | [backend-rollout.md](./backend-rollout.md) | backend migration, layer, FC deploy, alias publication, job-runner trigger rollout |
| Frontend ESA rollout | [frontend-rollout.md](./frontend-rollout.md) | frontend ESA deploy flow, hosted validation, ESA project publication |
| Release automation | [release-automation.md](./release-automation.md) | Release Please source metadata and deployment-gated GitHub Release semantics |

## Hosted Rollout Rules

- GitHub Actions is the canonical hosted rollout path.
- Repository scripts are the canonical executable rollout path used by Actions.
- Manual deployment, when used, must go through the same scripts and preserve
  the same ordering.
- Backend migrations happen before backend app deploy.
- Production backend GitHub Releases happen only after production alias
  publication succeeds.
- Production frontend GitHub Releases happen only after production ESA deploy
  succeeds.

## Manual Rollout Reality

Manual backend deployment is supported through the same repository scripts used
by GitHub Actions. GitHub Actions remains the canonical hosted rollout path.

If manual deploy is used:

- migration function deployment/invocation must still happen before backend app
  deploy
- layer publishing and latest layer ARN resolution must remain consistent with
  the FC function deploy
- job-runner trigger deploy must preserve the same cron and target URL contract
  as the hosted workflow
