# Frontend ESA Push Deploy

## Objective & Hypothesis

Move the frontend rollout control plane from Aliyun ESA pull-based source
deployment to a GitHub Actions push-based deployment workflow.

Hypothesis: the existing Vite static build and `apps/frontend/esa.jsonc` SPA
asset contract are sufficient for GitHub Actions to build `apps/frontend/dist`
and publish it to Aliyun ESA through `esa-cli`, while keeping product behavior
unchanged.

## Guardrails Touched

- Deployment truth: `docs/40-deployment/rollout.md`,
  `docs/40-deployment/environments.md`
- Hosted rollout automation: `.github/workflows/frontend-esa-deploy.yml`
- Workflow-local operating constraint: `.github/workflows/AGENTS.md`
- Canonical executable rollout path: `scripts/ci/esa/deploy_frontend.sh`
- Aliyun deploy credentials: `ALIBABA_CLOUD_ACCESS_KEY_ID` and
  `ALIBABA_CLOUD_ACCESS_KEY_SECRET`; the frontend ESA script maps them to the
  ESA CLI environment names at invocation time.
- Environment split: GitHub `staging` and `production` environments point to
  different ESA projects through `ALIYUN_ESA_PROJECT_NAME`; each selected ESA
  project is published to ESA environment `production`.
- Frontend build-time environment: `VITE_API_URL`,
  `VITE_TENCENT_LBS_JS_KEY`, `VITE_FRONTEND_COMMIT_HASH`
- Frontend hosted validation: Vitest JSONC imports and strict token
  governance must pass because the deploy workflow runs the same checks before
  publishing.
- Release automation: general Release Please creates frontend release PRs and
  skips frontend GitHub Release creation; the frontend ESA deploy workflow
  creates frontend GitHub Releases only after successful `master` production
  deployment.

## Verification

- Parse GitHub Actions workflow YAML.
- Parse Release Please JSON configuration.
- Run `pnpm --filter @partner-up-dev/frontend lint:tokens:strict` locally.
- Run `pnpm test:unit:frontend` locally.
- Run `pnpm --filter @partner-up-dev/frontend build` locally.
- Run `CI_ESA_DRY_RUN=true` against `scripts/ci/esa/deploy_frontend.sh`.
- Review workflow and documentation diff for consistency with the first-phase
  scope.
