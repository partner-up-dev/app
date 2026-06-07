# AGENTS.md for `.github/workflows`

- Keep GitHub Actions workflows as thin hosted entry points.
- Put validation, build, packaging, deploy, and recovery control flow in
  repository-owned scripts under `scripts/ci/**`.
- A workflow may own triggers, permissions, concurrency, GitHub Environment
  selection, runner setup, and environment variable mapping.
- A workflow should call one repository script for the main job whenever the
  behavior is non-trivial.
- Pin third-party action major versions and CLI/package versions used by
  repository scripts.
- Do not hide production rollout semantics in YAML-only shell blocks.
- Update `docs/40-deployment/` when workflow behavior changes runtime,
  rollout, release, or recovery truth.
