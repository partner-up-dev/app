# Batch 7: Deployment Cleanup Plan For F5-001 To F5-007

## Scope

This batch covers findings from [Phase 5: Deployment Audit](./phase-05-deployment-audit.md):

- F5-001: `environments.md` is overloaded across several runtime owners
- F5-002: Job Runner Trigger cron contract is inconsistent with workflow fallback
- F5-003: backend deploy environment contract is not fully aligned with runtime template and workflow
- F5-004: package-local backend deployment docs duplicate canonical deployment truth
- F5-005: `rollout.md` mixes hosted rollout, release automation, gate topology, and design package maintenance
- F5-006: recovery doc is too thin relative to deployment complexity
- F5-007: observability has clear gaps but no follow-up owner

User direction for F5-002:

- align documentation to the actual workflow fallback
- do not change the workflow fallback in this batch unless a later explicit decision reopens runtime behavior

## Objective

Restore `docs/40-deployment/` as the canonical deployment truth layer while keeping implementation-local deployment files useful and concise.

This batch should:

- make actual runtime defaults explicit
- separate local development, backend FC, frontend ESA, provider edge, and job-runner environment truth
- align backend environment documentation with workflow, validator, and template reality
- reduce package-local deployment duplication
- split rollout guidance by operational surface if the current single file remains too dense
- strengthen recovery and observability docs without creating rollback claims that the system does not support

## Proposed Segments

### Segment 1: Runtime Contract Alignment

Findings covered:

- F5-002
- F5-003
- part of F5-001

Files likely touched:

- `docs/40-deployment/environments.md`
- `apps/backend/fc-job-runner-trigger/README.md`
- possibly `apps/backend/DEPLOYMENT.md` only if it repeats stale environment facts

Durable changes:

- Document the actual Job Runner Trigger fallback:
  - workflow fallback: `0 */30 * * * *`
  - meaning: every 30 minutes, all day, when `ALIYUN_FC_JOB_RUNNER_TRIGGER_CRON` is absent from the selected GitHub Environment
  - business-hour behavior requires setting `ALIYUN_FC_JOB_RUNNER_TRIGGER_CRON` explicitly
- Treat the previously documented `CRON_TZ=Asia/Shanghai 0 0/30 8-23 ? * ?` as an override example or intended environment value, not the current fallback.
- Split backend variables into:
  - local-only runtime variables
  - GitHub workflow inputs
  - deployed FC runtime environment variables
  - validation-only requirements
- Align the backend FC environment table with:
  - `.github/workflows/backend-fc-deploy.yml`
  - `scripts/ci/fc/validate_backend_env.sh`
  - `apps/backend/s.yaml`
- Remove or clearly scope `IMAGES_DIR` as local-only if it is not passed by `apps/backend/s.yaml`.
- Add deployed optional runtime variables currently supplied by workflow/template, including fixed IP proxy, LLM, and WeCom-related values.

State diff:

```text
deployment docs imply business-hour cron as default and show partial backend env contract
  -> deployment docs state actual cron fallback and derive backend env contract from workflow/template/validator
```

Important non-change:

```text
workflow fallback stays: 0 */30 * * * *
```

### Segment 2: Deployment Topology Split

Findings covered:

- F5-001
- F5-004
- F5-005

Files likely touched:

- `docs/40-deployment/index.md`
- `docs/40-deployment/environments.md`
- `docs/40-deployment/rollout.md`
- optional new deployment docs under `docs/40-deployment/`
- `apps/backend/DEPLOYMENT.md`
- `apps/backend/fc-db-migrate/README.md`
- `apps/backend/fc-job-runner-trigger/README.md`

Recommended split shape:

```text
docs/40-deployment/
|-- index.md
|-- environments.md              # router / overview
|-- backend-runtime.md           # backend FC env, migration function, job-runner trigger
|-- frontend-runtime.md          # ESA env and frontend hosted runtime
|-- provider-edge-routing.md     # CaoCao callback edge and provider callback constraints
|-- rollout.md                   # router / overview
|-- ci-gates.md                  # validation gate topology
|-- backend-rollout.md           # backend FC deploy, migration, alias publication
|-- frontend-rollout.md          # frontend ESA deploy, GitHub Release interaction
|-- release-automation.md        # release-gated automation semantics
|-- observability.md
`-- recovery.md
```

This is a proposed target shape. Segment execution may keep fewer files if the content compresses cleanly after Segment 1.

Durable changes:

- Keep `environments.md` as a concise router if split files are created.
- Keep `rollout.md` as a concise router if split files are created.
- Move hosted deployment flow and CI/release semantics into focused deployment docs.
- Remove design-web package and agent-skill maintenance detail from deployment rollout unless directly needed for hosted deployment.
- Leave only the deployment-relevant design-web note:
  - frontend deployment may require GitHub Packages authentication when package installation happens in CI
  - package API, visual foundation, and agent skill usage belong outside deployment rollout
- Slim package-local backend deployment docs into implementation pointers:
  - handler entrypoint
  - local template file
  - local deployment command shape if package-specific
  - pointer to `docs/40-deployment/` for durable runtime, rollout, recovery, and observability truth

State diff:

```text
environments.md and rollout.md carry multiple unrelated operational surfaces
  -> deployment docs route to focused runtime and rollout owners

package-local READMEs repeat deployment truth
  -> package-local READMEs identify implementation files and point to deployment docs for durable truth
```

### Segment 3: Recovery And Observability Strengthening

Findings covered:

- F5-006
- F5-007

Files likely touched:

- `docs/40-deployment/recovery.md`
- `docs/40-deployment/observability.md`
- possibly `docs/40-deployment/index.md`

Durable changes:

- Add recovery routing for:
  - failed migration before backend deploy
  - backend deploy failure after migration
  - production alias publication failure
  - frontend ESA deploy failure
  - job-runner trigger deploy failure
  - job-runner tick failure
  - CaoCao callback edge routing failure
  - WeChat / WeCom notification delivery failure
- Keep recovery forward-only:
  - no reset claim for staging or production DB
  - no rollback claim unless a verified rollback mechanism exists
  - recovery should prefer fix-forward, re-run, disable trigger, restore route config, or publish known-good artifact where that is actually supported
- Classify observability gaps by owner:
  - deployment operations policy
  - backend runtime architecture
  - Product TDD / scenario coverage
  - future task packet
- Add follow-up routing without pretending unresolved observability gaps are already implemented.

State diff:

```text
recovery has high-level principles only
  -> recovery has surface-specific entrypoints and forward-only constraints

observability lists gaps without owners
  -> observability gaps are classified by owner and follow-up route
```

## Out Of Scope

- Changing production runtime behavior.
- Changing workflow fallback cron value.
- Adding new deployment automation.
- Adding new observability infrastructure.
- Adding scenario tests or backend runtime code.
- Rewriting product claims or Product TDD contracts.
- Changing design-web package behavior or package release process.

## Impact Handshake

Address and Object:

- deployment truth:
  - `docs/40-deployment/index.md`
  - `docs/40-deployment/environments.md`
  - `docs/40-deployment/rollout.md`
  - `docs/40-deployment/observability.md`
  - `docs/40-deployment/recovery.md`
  - optional focused new files under `docs/40-deployment/`
- package-local implementation docs:
  - `apps/backend/DEPLOYMENT.md`
  - `apps/backend/fc-db-migrate/README.md`
  - `apps/backend/fc-job-runner-trigger/README.md`
- evidence anchors:
  - `.github/workflows/backend-fc-deploy.yml`
  - `.github/workflows/job-runner-trigger-fc-deploy.yml`
  - `.github/workflows/frontend-esa-deploy.yml`
  - `.github/workflows/release-please.yml`
  - `scripts/ci/fc/validate_backend_env.sh`
  - `apps/backend/s.yaml`
  - `apps/backend/fc-db-migrate/s.yaml`
  - `apps/backend/fc-job-runner-trigger/s.yaml`
  - `apps/frontend/esa.jsonc`

State Diff:

```text
deployment docs are partly stale, dense, and duplicated with package-local docs
  -> deployment docs own focused runtime/rollout/recovery/observability truth, while package-local docs become implementation pointers

cron docs imply a different fallback than workflow reality
  -> cron docs state the workflow fallback and explain the environment override needed for business-hour cadence
```

Blast Radius Forecast:

- Medium documentation blast radius.
- Low runtime blast radius because this batch is documentation-only unless explicitly reopened.
- Main risk is over-splitting deployment docs or accidentally removing useful package-local operator clues.

Invariants:

- `docs/40-deployment/` remains the durable owner for runtime, rollout, observability, and recovery truth.
- Package-local deployment docs remain useful for nearby implementation entrypoints.
- Workflow and template files remain the evidence source for actual deployment behavior.
- No production runtime behavior changes occur in Batch 7 without explicit approval.
- Recovery remains forward-only unless a verified rollback mechanism exists.
- Design-web package API and agent-skill usage do not become deployment truth.

Verification:

```bash
rg -n 'CRON_TZ=Asia/Shanghai 0 0/30 8-23|0 \\*/30 \\* \\* \\* \\*|ALIYUN_FC_JOB_RUNNER_TRIGGER_CRON' docs/40-deployment apps/backend .github/workflows -g '*.md' -g '*.yml' -g '*.yaml'
rg -n 'IMAGES_DIR|WECHAT_OAUTH_CALLBACK_URL|FIXED_IP_HTTP_PROXY|LLM_API_KEY|LLM_BASE_URL|LLM_DEFAULT_MODEL|WECOM_' docs/40-deployment apps/backend .github/workflows scripts/ci/fc -g '*.md' -g '*.yml' -g '*.yaml' -g '*.sh'
rg -n 'design-web|sync-design-web-package|intent install|@partner-up-dev/design-web' docs/40-deployment apps/frontend apps/backend -g '*.md'
rg -n 'rollback|reset|forward-only|migration|alias|ESA|job-runner|CaoCao|WeCom|WeChat' docs/40-deployment -g '*.md'
find docs/40-deployment -maxdepth 1 -type f -name '*.md' -print0 | xargs -0 wc -l | sort -n
git diff --check -- docs/40-deployment apps/backend/DEPLOYMENT.md apps/backend/fc-db-migrate/README.md apps/backend/fc-job-runner-trigger/README.md tasks/doc-governance-cleanup
```

Manual review:

- confirm the cron section no longer says business-hour cadence is the workflow fallback
- confirm backend environment tables match workflow/template/validator reality
- confirm split docs improve owner clarity instead of creating shallow fragments
- confirm package-local README files still help a maintainer find the implementation entrypoint
- confirm recovery guidance does not promise rollback behavior the system lacks
- confirm observability gaps are classified as explicit follow-up work, not silently normalized

## Proposed Execution Order

1. Execute Segment 1 first because it resolves actual stale runtime claims.
2. Execute Segment 2 only after Segment 1 reveals the final shape and size of `environments.md` and `rollout.md`.
3. Execute Segment 3 last because recovery and observability should route to the final deployment topology.

## Execution Record

Executed after explicit user start.

Segment 1 completed:

- `docs/40-deployment/backend-runtime.md` now owns the backend FC runtime
  contract, deploy variables, optional runtime variables, local-only upload
  fallbacks, database environment model, and job-runner trigger runtime.
- Job-runner trigger cron docs now state the actual workflow fallback:
  `0 */30 * * * *`.
- The previous business-hour cron is preserved only as an explicit GitHub
  Environment override example.
- No workflow fallback or production runtime behavior was changed.

Segment 2 completed:

- `docs/40-deployment/environments.md` is now a runtime owner router.
- `docs/40-deployment/rollout.md` is now a rollout owner router.
- New focused docs were added:
  - `docs/40-deployment/local-development.md`
  - `docs/40-deployment/backend-runtime.md`
  - `docs/40-deployment/frontend-runtime.md`
  - `docs/40-deployment/provider-edge-routing.md`
  - `docs/40-deployment/ci-gates.md`
  - `docs/40-deployment/backend-rollout.md`
  - `docs/40-deployment/frontend-rollout.md`
  - `docs/40-deployment/release-automation.md`
- Package-local backend deployment docs were compressed into implementation
  entrypoints and pointers:
  - `apps/backend/DEPLOYMENT.md`
  - `apps/backend/fc-db-migrate/README.md`
  - `apps/backend/fc-job-runner-trigger/README.md`

Segment 3 completed:

- `docs/40-deployment/recovery.md` now contains surface-specific recovery
  routing for migration, backend deploy, alias publication, frontend ESA,
  job-runner trigger/tick, CaoCao edge, and notification delivery failures.
- `docs/40-deployment/observability.md` now classifies current gaps by owner
  route instead of leaving them as unowned gaps.

Verification performed:

```bash
rg -n 'CRON_TZ=Asia/Shanghai 0 0/30 8-23|0 \*/30 \* \* \* \*|ALIYUN_FC_JOB_RUNNER_TRIGGER_CRON' docs/40-deployment apps/backend .github/workflows -g '*.md' -g '*.yml' -g '*.yaml'
rg -n 'IMAGES_DIR|WECHAT_OAUTH_CALLBACK_URL|FIXED_IP_HTTP_PROXY|LLM_API_KEY|LLM_BASE_URL|LLM_DEFAULT_MODEL|WECOM_' docs/40-deployment apps/backend .github/workflows scripts/ci/fc -g '*.md' -g '*.yml' -g '*.yaml' -g '*.sh'
rg -n 'design-web|sync-design-web-package|intent install|@partner-up-dev/design-web' docs/40-deployment apps/frontend apps/backend -g '*.md'
rg -n 'rollback|reset|forward-only|migration|alias|ESA|job-runner|CaoCao|WeCom|WeChat' docs/40-deployment -g '*.md'
find docs/40-deployment -maxdepth 1 -type f -name '*.md' -print0 | xargs -0 wc -l | sort -n
git diff --check -- docs/40-deployment apps/backend/DEPLOYMENT.md apps/backend/fc-db-migrate/README.md apps/backend/fc-job-runner-trigger/README.md tasks/doc-governance-cleanup
```
