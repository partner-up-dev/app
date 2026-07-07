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
  ci_esa_run pnpm --filter @partner-up-dev/web lint:tokens:strict
  ci_esa_run pnpm test:unit:web
}

build_frontend() {
  install_workspace_dependencies
  ci_esa_run pnpm --filter @partner-up-dev/web build
}

normalize_positive_integer() {
  local value="$1"
  local fallback="$2"

  case "$value" in
    '' | *[!0-9]*) echo "$fallback" ;;
    0) echo "$fallback" ;;
    *) echo "$value" ;;
  esac
}

esa_deploy_failed_from_login_probe() {
  local output_file="$1"

  grep -Fq "Maybe you are not logged in yet." "$output_file" ||
    grep -Fq "You are not logged in" "$output_file"
}

run_esa_deploy_with_retry() {
  local project_name="$1"
  local environment="$2"
  local description="$3"
  local max_attempts
  local retry_delay_seconds
  local attempt=1

  max_attempts="$(normalize_positive_integer "${CI_ESA_DEPLOY_MAX_ATTEMPTS:-3}" 3)"
  retry_delay_seconds="$(normalize_positive_integer "${CI_ESA_DEPLOY_RETRY_DELAY_SECONDS:-8}" 8)"

  local -a deploy_command=(
    npx
    --yes
    esa-cli@1.0.10
    deploy
    --name
    "$project_name"
    --assets
    ./dist
    --environment
    "$environment"
    --description
    "$description"
  )

  while [ "$attempt" -le "$max_attempts" ]; do
    echo "+ ${deploy_command[*]} (attempt ${attempt}/${max_attempts})"
    if ci_esa_dry_run; then
      return 0
    fi

    local output_file
    output_file="$(mktemp)"

    set +e
    "${deploy_command[@]}" 2>&1 | tee "$output_file"
    local deploy_status="${PIPESTATUS[0]}"
    set -e

    if [ "$deploy_status" -eq 0 ]; then
      rm -f "$output_file"
      return 0
    fi

    # esa-cli@1.0.10 sometimes reports a failed transient GetErService
    # credential probe as "not logged in" immediately after env credential
    # validation succeeds. Retry only this known CLI/API probe defect.
    if ! esa_deploy_failed_from_login_probe "$output_file"; then
      rm -f "$output_file"
      return "$deploy_status"
    fi

    rm -f "$output_file"

    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "esa-cli deploy login probe still failed after ${max_attempts} attempt(s)." >&2
      return "$deploy_status"
    fi

    echo "esa-cli deploy login probe failed; retrying in ${retry_delay_seconds}s because esa-cli@1.0.10 can misreport transient credential validation failure as not logged in." >&2
    sleep "$retry_delay_seconds"
    attempt=$((attempt + 1))
  done
}

deploy_frontend() {
  local project_name="${ALIYUN_ESA_PROJECT_NAME:-partner-up-mvp-ha}"
  local environment="${ALIYUN_ESA_ENVIRONMENT:-$(ci_esa_environment)}"
  local description="${ALIYUN_ESA_DEPLOY_DESCRIPTION:-github:${GITHUB_SHA:-local}}"

  export ESA_ACCESS_KEY_ID="$ALIBABA_CLOUD_ACCESS_KEY_ID"
  export ESA_ACCESS_KEY_SECRET="$ALIBABA_CLOUD_ACCESS_KEY_SECRET"

  run_esa_deploy_with_retry "$project_name" "$environment" "$description"
}

main() {
  validate_environment
  validate_frontend
  build_frontend

  cd apps/web
  deploy_frontend
}

main "$@"
