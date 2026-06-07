#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

ci_esa_cd_repo_root

workspace_dependencies_installed=false

install_workspace_dependencies() {
  if [ "$workspace_dependencies_installed" = "true" ]; then
    return 0
  fi

  ci_esa_run pnpm install --frozen-lockfile
  workspace_dependencies_installed=true
}

validate_environment() {
  echo "+ bash scripts/ci/esa/validate_frontend_env.sh"
  bash scripts/ci/esa/validate_frontend_env.sh
}

validate_frontend() {
  install_workspace_dependencies
  ci_esa_run pnpm --filter @partner-up-dev/frontend lint:tokens:strict
  ci_esa_run pnpm test:unit:frontend
}

build_frontend() {
  install_workspace_dependencies
  ci_esa_run pnpm --filter @partner-up-dev/frontend build
}

deploy_frontend() {
  local project_name="${ALIYUN_ESA_PROJECT_NAME:-partner-up-mvp-ha}"
  local environment="${ALIYUN_ESA_ENVIRONMENT:-$(ci_esa_environment)}"
  local description="${ALIYUN_ESA_DEPLOY_DESCRIPTION:-github:${GITHUB_SHA:-local}}"

  export ESA_ACCESS_KEY_ID="$ALIBABA_CLOUD_ACCESS_KEY_ID"
  export ESA_ACCESS_KEY_SECRET="$ALIBABA_CLOUD_ACCESS_KEY_SECRET"

  ci_esa_run npx --yes esa-cli@1.0.10 login
  ci_esa_run npx --yes esa-cli@1.0.10 deploy \
    --name "$project_name" \
    --assets ./dist \
    --environment "$environment" \
    --description "$description"
}

main() {
  validate_environment
  validate_frontend
  build_frontend

  cd apps/frontend
  deploy_frontend
}

main "$@"
