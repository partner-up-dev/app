#!/usr/bin/env bash
set -euo pipefail

ci_esa_is_true() {
  case "${1:-}" in
    true | TRUE | 1 | yes | YES) return 0 ;;
    *) return 1 ;;
  esac
}

ci_esa_dry_run() {
  ci_esa_is_true "${CI_ESA_DRY_RUN:-false}"
}

ci_esa_run() {
  echo "+ $*"
  if ci_esa_dry_run; then
    return 0
  fi

  "$@"
}

ci_esa_repo_root() {
  git rev-parse --show-toplevel 2>/dev/null || pwd
}

ci_esa_cd_repo_root() {
  cd "$(ci_esa_repo_root)"
}

ci_esa_environment() {
  echo "production"
}
