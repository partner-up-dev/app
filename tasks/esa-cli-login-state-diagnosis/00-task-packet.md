# ESA CLI Login State Diagnosis

## Objective & Hypothesis

Investigate why GitHub Actions job
`https://github.com/partner-up-dev/app/actions/runs/28851789370/job/85568649427`
prints `Login success!` from `esa-cli login`, then shortly after fails
`esa-cli deploy` with `Maybe you are not logged in yet.`

Initial hypothesis: this is not caused by GitHub Actions job concurrency or a
missing repository environment variable. The failure is likely an `esa-cli`
credential validation/reporting weakness around its repeated `GetErService`
probe.

## Guardrails Touched

- Reality route: observed hosted CI behavior diverges from expected deploy
  behavior.
- Deployment owner: `.github/workflows/frontend-esa-deploy.yml` and
  `scripts/ci/esa/deploy_frontend.sh`.
- No CI script or code mutation was made during this diagnosis.

## Evidence

- Linked job `85568649427` failed on 2026-07-07:
  - `08:17:02Z`: `esa-cli@1.0.10 login` prints `Get credentials from environment variables`
    and `Login success!`.
  - `08:17:04Z`: `esa-cli@1.0.10 deploy` starts `Checking login status`.
  - `08:17:06Z`: deploy prints `Maybe you are not logged in yet.` and exits 1.
- Repository deploy script exports `ESA_ACCESS_KEY_ID` and
  `ESA_ACCESS_KEY_SECRET`, then invokes two separate `npx --yes esa-cli@1.0.10`
  commands: first `login`, then `deploy`.
- `esa-cli@1.0.10` is the current npm latest version as checked on
  2026-07-07.
- `esa-cli@1.0.10 login` with env credentials validates credentials and prints
  success, but does not persist credentials into `~/.esa/config/default.toml`.
- `esa-cli@1.0.10 deploy` checks login by reading env credentials first, then
  config credentials, and calls the same credential validation path.
- The validation path calls ESA `GetErService` against the domestic endpoint,
  then the international endpoint. If validation fails, the deploy command
  collapses the failure into the generic message `Maybe you are not logged in
  yet.`
- Nearby successful runs used the same script shape:
  - `28839031916` / job `85528920268`: login success, deploy login check
    `Logged in`, deploy finished.
  - `28841687859` / job `85536872746`: login success, deploy login check
    `Logged in`, deploy finished.
  - `28840439094` / job `85533172116`: ESA deploy finished; the job later failed
    in release creation, unrelated to ESA login state.

## Hypothesis Ranking

1. Strongest: ESA credential validation is intermittently failing between two
   near-identical `GetErService` calls, and `esa-cli` reports that as "not
   logged in" instead of surfacing the underlying API error.
2. Plausible CLI design weakness: `login` with env credentials does not persist
   credentials, so "Login success!" means only "this validation call succeeded",
   not "a durable login session exists".
3. Weak: repository env propagation issue. The deploy process should inherit
   the exported env vars from the same shell, and successful adjacent runs prove
   the same invocation path can work.
4. Weak: workflow concurrency or runner state collision. The workflow uses a
   single job and the `web-esa-deploy` concurrency group, and the failing check
   happens inside one shell process sequence.

## Verification

- Inspected GitHub Actions run and job metadata with `gh`.
- Downloaded and inspected `esa-cli@1.0.10` npm package source under `/tmp`.
- Compared the linked failure with adjacent successful ESA deploy runs.

## Next Action Candidate

If mutation is approved, prefer a small CI hardening change:

- remove the standalone `esa-cli login` as a false durability signal, or keep it
  only as an explicit credential probe;
- wrap `esa-cli deploy` in a bounded retry that retries only the known login
  probe failure string;
- add log output that makes the retry reason and attempt count visible without
  leaking credentials.

## Applied Change

After approval, `scripts/ci/esa/deploy_frontend.sh` was hardened:

- removed the standalone `esa-cli login` preflight because env credential mode
  does not persist durable login state;
- added a bounded `esa-cli deploy` retry around only the known
  `Maybe you are not logged in yet.` / `You are not logged in` probe failure;
- documented the `esa-cli@1.0.10` behavior in durable frontend deployment docs.

Verification:

- `bash -n scripts/ci/esa/deploy_frontend.sh scripts/ci/esa/common.sh scripts/ci/esa/validate_frontend_env.sh`
- `CI_ESA_DRY_RUN=true ... bash scripts/ci/esa/deploy_frontend.sh`
- mocked `pnpm`/`npx` retry-path verification for login-probe failure
- mocked `pnpm`/`npx` non-login failure verification to confirm no retry
- `/home/yyh/.local/bin/shellcheck -x -P SCRIPTDIR scripts/ci/esa/deploy_frontend.sh scripts/ci/esa/common.sh scripts/ci/esa/validate_frontend_env.sh`
- `pnpm check:format`
