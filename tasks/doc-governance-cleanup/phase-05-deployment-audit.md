# Phase 5: Deployment Audit

## Objective

Audit `docs/40-deployment/` after PRD, Product TDD, Unit TDD, and local AGENTS cleanup.

The Deployment question is:

- does `docs/40-deployment/` still own actual runtime, rollout, observability, and recovery truth?
- are deployment facts duplicated in package-local docs or scripts?
- are any documented runtime facts stale relative to workflow/script reality?
- what cleanup should be proposed before durable mutation?

## Inventory

Deployment docs:

```text
docs/40-deployment/index.md
docs/40-deployment/environments.md
docs/40-deployment/rollout.md
docs/40-deployment/observability.md
docs/40-deployment/recovery.md
```

Related runtime and rollout surfaces reviewed:

```text
.github/workflows/*.yml
.github/workflows/AGENTS.md
scripts/ci/fc/*.sh
scripts/ci/esa/*.sh
apps/backend/DEPLOYMENT.md
apps/backend/fc-db-migrate/README.md
apps/backend/fc-job-runner-trigger/README.md
apps/backend/s.yaml
apps/backend/fc-db-migrate/s.yaml
apps/backend/fc-job-runner-trigger/s.yaml
apps/frontend/esa.jsonc
```

Length profile:

- `environments.md`: 346 lines
- `rollout.md`: 234 lines
- `observability.md`: 53 lines
- `recovery.md`: 28 lines
- `index.md`: 41 lines

## Findings

### F5-001: `environments.md` Is Overloaded Across Several Runtime Owners

Evidence:

- `environments.md` currently owns local portless development, backend FC runtime, WeChat template source rows, backend deploy environment variables, CaoCao callback edge routing, branch environment split, database environment model, job-runner trigger environment, and frontend ESA deployment truth.
- It is the largest deployment file at 346 lines.

Why it matters:

- The file mixes different operational surfaces that change at different rates.
- Local development workflow, backend runtime variables, provider callback edge routing, and frontend ESA deployment all have separate evidence sources and failure modes.
- Future edits may over-modify the whole file because there is no focused owner for a single runtime family.

Candidate cleanup:

- Split or introduce owner sections for:
  - local development runtime
  - backend FC runtime environment
  - frontend ESA runtime environment
  - provider callback edge routing
  - job-runner trigger environment
- Keep `environments.md` as an index/router if splitting becomes worthwhile.

### F5-002: Job Runner Trigger Cron Contract Is Inconsistent With Workflow Fallback

Evidence:

- `docs/40-deployment/environments.md` and `apps/backend/fc-job-runner-trigger/README.md` document cron:

```text
CRON_TZ=Asia/Shanghai 0 0/30 8-23 ? * ?
```

- `.github/workflows/job-runner-trigger-fc-deploy.yml` sets fallback:

```text
ALIYUN_FC_JOB_RUNNER_TRIGGER_CRON: ${{ vars.ALIYUN_FC_JOB_RUNNER_TRIGGER_CRON || '0 */30 * * * *' }}
```

- `apps/backend/fc-job-runner-trigger/s.yaml` deploys whatever `ALIYUN_FC_JOB_RUNNER_TRIGGER_CRON` contains.

Why it matters:

- If the GitHub Environment variable is absent, deployed behavior becomes all-day every 30 minutes, not the documented Asia/Shanghai 8-23 schedule.
- This is an actual runtime truth mismatch, not just documentation style.

Candidate cleanup:

- Decide the durable default:
  - either change workflow fallback to the documented `CRON_TZ=Asia/Shanghai 0 0/30 8-23 ? * ?`
  - or change docs to state the fallback is all-day and the GitHub Environment variable must be set for business-hour behavior
- Prefer one owner for the default cron contract, then make README and deployment docs point to it.

### F5-003: Backend Deploy Environment Contract Is Not Fully Aligned With Runtime Template And Workflow

Evidence:

- `docs/40-deployment/environments.md` lists optional GitHub Environment variables passed to backend runtime as:
  - `IMAGES_DIR`
  - `WECHAT_OAUTH_CALLBACK_URL`
- `apps/backend/s.yaml` does not pass `IMAGES_DIR`; it does pass:
  - `WECHAT_OAUTH_CALLBACK_URL`
  - `FIXED_IP_HTTP_PROXY`
  - `LLM_API_KEY`
  - `LLM_BASE_URL`
  - `LLM_DEFAULT_MODEL`
  - `WECOM_TOKEN`
  - `WECOM_ENCODING_AES_KEY`
  - `WECOM_CORP_ID`
  - `WECOM_APP_AGENT_ID`
  - `WECOM_APP_SECRET`
- `.github/workflows/backend-fc-deploy.yml` supplies those same optional runtime values from vars/secrets.
- `scripts/ci/fc/validate_backend_env.sh` validates `LLM_API_KEY` only when `LLM_BASE_URL` is set.

Why it matters:

- `IMAGES_DIR` appears to be local runtime guidance, not a deployed backend runtime variable in the current FC template.
- Optional deployed runtime variables are partly undocumented, especially fixed IP proxy, LLM defaults, and WeCom webhook/config values.
- Environment docs should describe the actual template/workflow contract, not a partial or local-only projection.

Candidate cleanup:

- Split local-only runtime variables from deployed FC runtime variables.
- Make the backend deploy environment contract derive from:
  - `.github/workflows/backend-fc-deploy.yml`
  - `scripts/ci/fc/validate_backend_env.sh`
  - `apps/backend/s.yaml`
- Add a small table with columns: variable, GitHub source, required/optional, runtime destination, owner note.

### F5-004: Package-Local Backend Deployment Docs Duplicate Canonical Deployment Truth

Evidence:

- `apps/backend/DEPLOYMENT.md` repeats migration workflow, FC migration function, timer function, RDS, FC, OSS, reset, and forward-only recovery facts already represented in `docs/40-deployment/`.
- `apps/backend/fc-db-migrate/README.md` repeats FC migration function behavior and deployment sequencing.
- `apps/backend/fc-job-runner-trigger/README.md` repeats timer trigger runtime and cron facts.

Why it matters:

- Package-local README files are useful near implementation, but they can drift from canonical deployment docs.
- The job-runner cron mismatch shows this drift is already possible.

Candidate cleanup:

- Keep package-local README files as implementation pointers:
  - local file list
  - handler entry
  - required local template inputs
  - pointer to `docs/40-deployment/*` for durable rollout/runtime truth
- Move or confirm durable environment and rollout truth in deployment docs.

### F5-005: `rollout.md` Mixes Hosted Rollout, Release Automation, Gate Topology, And Design Package Maintenance

Evidence:

- `rollout.md` owns CI validation gates, backend FC deploy flow, release automation, DB artifact validation, job-runner trigger rollout, frontend ESA deploy flow, design package update process, and manual rollout reality.
- The design-web section includes agent skill / Codex hook guidance:
  - `@partner-up-dev/design-web` skill location
  - `node scripts/sync-design-web-package.mjs`
  - `intent install` guidance

Why it matters:

- CI/CD flow and release automation belong in deployment docs.
- Design package maintenance partly belongs to frontend operational guidance and agent/tooling guidance, not hosted rollout.
- Keeping all of it in `rollout.md` makes that file a mixed operations/manual/tooling document.

Candidate cleanup:

- Keep hosted deployment flow, release-gated GitHub Release semantics, and CI gates in rollout docs.
- Move design-web package/skill maintenance guidance to frontend-local AGENTS or a focused tooling/agent doc, leaving only a short deployment-relevant note if frontend deploy depends on GitHub Packages auth.
- Consider splitting `rollout.md` into:
  - `ci-gates.md`
  - `backend-rollout.md`
  - `frontend-rollout.md`
  - `release-automation.md`

### F5-006: Recovery Doc Is Too Thin Relative To Deployment Complexity

Evidence:

- `recovery.md` is 28 lines.
- Current deployment reality includes:
  - backend migration function and forward-only recovery
  - backend FC function deploy and production alias publication
  - frontend ESA deploy and GitHub Release creation
  - job-runner trigger function
  - CaoCao callback edge router
  - WeChat notification delivery failures
- `recovery.md` currently lists high-level principles but not surface-specific recovery entrypoints or owner routing.

Why it matters:

- Recovery docs should be usable under stress.
- Thin recovery guidance may be correct but insufficient for multi-surface deployment failures.

Candidate cleanup:

- Add focused recovery routing for:
  - failed migration before backend deploy
  - backend deploy failure after migration
  - production alias publication failure
  - frontend ESA deploy failure
  - job-runner trigger deploy or tick failure
  - CaoCao callback edge routing failure
  - notification delivery failures
- Keep recovery forward-only; do not introduce reset/rollback claims for staging or production DB.

### F5-007: Observability Has Clear Gaps But No Follow-Up Owner

Evidence:

- `observability.md` explicitly states current gaps:
  - no dedicated management UI for operation logs
  - no documented centralized alerting policy
  - `/internal/maintenance/tick` only avoids overlap inside one warm backend process
  - source-attribution scenario coverage gap for `/e/:eventId?spm=...`

Why it matters:

- Making gaps explicit is good, but there is no follow-up owner or cleanup protocol.
- Some gaps are operational policy, some are test coverage, some are runtime architecture.

Candidate cleanup:

- Keep gaps, but classify them by owner:
  - deployment/observability policy
  - Product TDD/test-platform follow-up
  - backend runtime architecture follow-up
  - task-local future work

## Recommended Batch Shape

Deployment cleanup should be segmented. Recommended next batches:

1. Batch 7A: Deployment runtime truth alignment
   - fix job-runner cron mismatch
   - align backend environment contract with workflow/template/validator
   - clarify local-only vs deployed runtime variables

2. Batch 7B: Deployment topology split
   - split or route `environments.md`
   - split or route `rollout.md`
   - slim package-local deployment READMEs to pointer-first implementation notes

3. Batch 7C: Recovery and observability strengthening
   - expand recovery by surface
   - classify observability gaps by owner

## Verification Performed

Commands run:

```bash
rg --files docs/40-deployment
find docs/40-deployment -type f -maxdepth 3 -print0 | xargs -0 wc -l | sort -n
rg -n '^#|^##|^###' docs/40-deployment apps/backend/DEPLOYMENT.md apps/backend/fc-db-migrate/README.md .github/workflows/AGENTS.md -g '*.md'
rg --files .github/workflows scripts/ci apps/backend/fc-db-migrate apps/backend/fc-job-runner-trigger apps/frontend | rg '(ya?ml|\\.sh$|\\.mjs$|s\\.yaml|esa\\.jsonc|README\\.md)$'
rg -n 'VITE_|FRONTEND_URL|PAYMENT_NOTIFY_BASE_URL|WECHAT_OAUTH_CALLBACK_URL|PARTNERUP_ENVIRONMENT|BACKEND_COMMIT_HASH|ALIYUN_|NODE_AUTH_TOKEN|design-web|intent|release|Release|db:lint|db:check|db:next|frontend-esa|backend-fc|job-runner|cron|CRON_TZ|caocao|callback|PORTLESS|dev:ensure|portless' .github/workflows scripts/ci apps/backend apps/frontend docs/40-deployment -g '*.{yml,yaml,sh,mjs,md,jsonc}'
```

Audit-only outcome:

- No durable deployment docs were modified during this audit.
- Findings are task-local and should become cleanup batches only after user approval.
