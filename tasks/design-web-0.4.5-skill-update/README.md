# design-web 0.4.5 Skill Update

## Objective & Hypothesis

Upgrade the frontend `@partner-up-dev/design-web` dependency from `0.4.4` to
`0.4.5`. The package-shipped `skills/design-web` directory is the agent skill
source of truth, so installing the new package version updates the associated
agent skill without hand-editing local skill copies.

## Guardrails Touched

- Constraint route: dependency and package-shipped skill boundary changes, with
  no product behavior change intended.
- Frontend unit: `apps/frontend/package.json` and the workspace lockfile.
- Deployment guidance: `docs/40-deployment/rollout.md` requires TanStack Intent
  `list`, `load`, and `validate` checks after changing the installed package
  version.

## Verification

- `pnpm --filter @partner-up-dev/frontend add @partner-up-dev/design-web@0.4.5`
  completed outside this agent session after initial network failures.
- `pnpm dlx @tanstack/intent@latest list --json` passed and discovered
  `@partner-up-dev/design-web#design-web` from local package version `0.4.5`.
- `pnpm dlx @tanstack/intent@latest load @partner-up-dev/design-web#design-web`
  passed.
- `pnpm dlx @tanstack/intent@latest validate apps/frontend/node_modules/@partner-up-dev/design-web/skills/design-web`
  passed: `Validated 1 skill files — all passed`.
- `pnpm check:type:frontend` passed.

## Current Understanding

- Previous frontend dependency was `@partner-up-dev/design-web@0.4.4`.
- Repository rollout truth says updating the package dependency is the skill
  update mechanism.
- Do not run `intent install` or add an `intent-skills` managed block unless
  explicitly requested.
- Current frontend dependency and lockfile are now
  `@partner-up-dev/design-web@0.4.5`.
- Installed package skill exists at
  `apps/frontend/node_modules/@partner-up-dev/design-web/skills/design-web`.

## Next Step

Ready for review.

## Attempt Log

- `pnpm --filter @partner-up-dev/frontend add @partner-up-dev/design-web@0.4.5`
  failed on npm registry metadata timeouts while resolving workspace packages.
- Retried with longer `fetch-timeout` and retry settings; still timed out.
- Retried with public registry set to `https://registry.npmmirror.com`; still
  timed out.
- Direct `npm view` / `pnpm view` against GitHub Packages for
  `@partner-up-dev/design-web@0.4.5` timed out.
- `curl -I` to GitHub, GitHub Packages, npmjs, and explicit resolved public IPs
  timed out at connection stage.
- Local cache search found only `@partner-up-dev/design-web@0.4.4`.
