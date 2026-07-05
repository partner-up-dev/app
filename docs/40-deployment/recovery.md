# Recovery

## Recovery Model

Staging and production recovery is forward-only unless a verified rollback
mechanism exists for the specific surface.

Do not infer hosted rollback or database reset options from local commands.
Local reset flows exist for development and tests only.

## Deployment Recovery Routing

| Failure surface | Stop condition | Recovery route |
| --- | --- | --- |
| Migration fails before backend deploy | `deploy_backend.sh` stops before backend FC deploy | inspect migration output, fix forward state or add remediation migration, rerun backend deploy |
| Backend deploy fails after migration | migration has already changed DB state | fix package/template/runtime issue and rerun backend deploy; do not reset staging or production DB |
| Production alias publication fails | `master` function deployed but alias did not move | inspect version publication and alias update logs, rerun alias publication script or backend deploy after confirming target version |
| Layer publish fails | backend app deploy has not completed | fix layer package/publish inputs, rerun backend deploy or layer-only workflow dispatch |
| Frontend ESA deploy fails | frontend GitHub Release must not be created | fix env/auth/build/deploy issue and rerun frontend deploy workflow |
| Job-runner trigger deploy fails | timer function may remain on previous deployed config | fix trigger env/template issue and rerun job-runner trigger workflow |
| Job-runner tick fails | due work may remain pending or become late/missed | inspect `jobs`, backend logs, and trigger logs; fix runtime issue, then invoke trigger or `/internal/maintenance/tick` |
| CaoCao callback edge fails | provider callbacks may route to wrong backend or fail before backend verification | inspect edge router process, nginx exact location, and backend callback logs; restore route config without rewriting callback bodies |
| WeChat / WeCom notification delivery fails | delivery outcome may be persisted as failed/rejected | inspect `notification_deliveries` and provider error codes; retry through job mechanisms only when refusal/quota semantics allow it |

## Deployment Failure

- if migration fails, backend deploy must not continue
- recovery is forward-only: fix migration state or add a remediation migration,
  then redeploy
- if a backend deploy fails after migration success, treat the database as the
  new forward state and fix the runtime/package issue against that state

## Runtime Failure

- request-tail job processing is best-effort; later requests or explicit tick
  triggers can continue progress
- failed background work should be retried through job mechanisms rather than
  assuming a persistent worker process
- `/internal/maintenance/tick` is an operational entrypoint and must be called
  with the internal token contract

## Notification Failure

- delivery failures are persisted
- user refusal signals such as `43101` should result in quota cleanup to avoid
  repeated failed sends
- do not blindly retry provider refusal or quota states without checking the
  recorded delivery semantics

## Database Failure Model

- staging and production are forward-only
- non-transactional migrations must be restart-safe and explicitly marked
- local reset flows do not imply production recovery options

## Operational Recovery Entry Points

- rerun GitHub Actions deploy after fixing forward state
- use the job-runner trigger or `/internal/maintenance/tick` to resume due work
- inspect persisted logs/jobs/deliveries before assuming user-facing state has
  converged
- use deployment owner docs for surface-specific runtime evidence:
  - [backend-runtime.md](./backend-runtime.md)
  - [backend-rollout.md](./backend-rollout.md)
  - [frontend-rollout.md](./frontend-rollout.md)
  - [provider-edge-routing.md](./provider-edge-routing.md)
