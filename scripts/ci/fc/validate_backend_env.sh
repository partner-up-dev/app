#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

mode="${1:-all}"

missing=0

require_group() {
  local group_name="$1"
  shift

  local var_name
  for var_name in "$@"; do
    if [ -z "${!var_name:-}" ]; then
      echo "Missing ${group_name} env var: ${var_name}" >&2
      missing=1
    fi
  done
}

require_min_length() {
  local var_name="$1"
  local min_length="$2"
  local value="${!var_name:-}"

  if [ -z "$value" ]; then
    echo "Missing runtime env var: ${var_name}" >&2
    missing=1
    return
  fi

  if [ "${#value}" -lt "$min_length" ]; then
    echo "${var_name} must be at least ${min_length} characters." >&2
    missing=1
  fi
}

require_if_set() {
  local trigger_var="$1"
  shift

  if [ -z "${!trigger_var:-}" ]; then
    return
  fi

  require_group "runtime" "$@"
}

require_partnerup_environment() {
  require_group "migration runtime" PARTNERUP_ENVIRONMENT

  case "${PARTNERUP_ENVIRONMENT:-}" in
    production | staging | "")
      ;;
    *)
      echo "PARTNERUP_ENVIRONMENT must be one of: production, staging." >&2
      missing=1
      ;;
  esac
}

validate_deploy_base() {
  require_group "deploy credential" \
    ALIBABA_CLOUD_ACCESS_KEY_ID \
    ALIBABA_CLOUD_ACCESS_KEY_SECRET \
    ALIBABA_CLOUD_ACCOUNT_ID

  require_group "deploy" \
    ALIYUN_FC_REGION
}

validate_layer() {
  validate_deploy_base
  require_group "layer" \
    ALIYUN_FC_NODE_MODULES_LAYER_NAME
}

validate_migration() {
  validate_deploy_base
  require_group "migration deploy" \
    ALIYUN_FC_DB_MIGRATION_FUNCTION_NAME \
    ALIYUN_FC_ROLE_ARN \
    ALIYUN_FC_RESOURCE_GROUP_ID \
    ALIYUN_FC_VPC_ID \
    ALIYUN_FC_SECURITY_GROUP_ID \
    ALIYUN_FC_VSWITCH_ID_PRIMARY \
    ALIYUN_FC_VSWITCH_ID_SECONDARY

  require_group "migration runtime" \
    DATABASE_URL_FOR_MIGRATION

  require_partnerup_environment
}

validate_runtime() {
  validate_deploy_base
  require_group "backend deploy" \
    ALIYUN_FC_FUNCTION_NAME \
    ALIYUN_FC_ROLE_ARN \
    ALIYUN_FC_RESOURCE_GROUP_ID \
    ALIYUN_FC_NODE_MODULES_LAYER_NAME \
    ALIYUN_FC_LOG_PROJECT \
    ALIYUN_FC_LOG_STORE \
    ALIYUN_FC_VPC_ID \
    ALIYUN_FC_SECURITY_GROUP_ID \
    ALIYUN_FC_VSWITCH_ID_PRIMARY \
    ALIYUN_FC_VSWITCH_ID_SECONDARY \
    ALIYUN_FC_OSS_ENDPOINT \
    ALIYUN_FC_OSS_BUCKET \
    ALIYUN_FC_OSS_BUCKET_PATH \
    ALIYUN_FC_PATH

  require_group "backend runtime" \
    DATABASE_URL \
    BACKEND_COMMIT_HASH \
    FRONTEND_URL \
    PAYMENT_NOTIFY_BASE_URL \
    WECHAT_OFFICIAL_ACCOUNT_APP_ID \
    WECHAT_OFFICIAL_ACCOUNT_APP_SECRET \
    WECHAT_AUTH_SESSION_SECRET \
    JOB_RUNNER_INTERNAL_TOKEN

  require_min_length AUTH_JWT_SECRET 32
  require_if_set LLM_BASE_URL LLM_API_KEY
}

case "$mode" in
  layer)
    validate_layer
    ;;
  migration)
    validate_migration
    ;;
  runtime)
    validate_runtime
    ;;
  all)
    validate_layer
    validate_migration
    validate_runtime
    ;;
  *)
    echo "Usage: $0 [layer|migration|runtime|all]" >&2
    exit 2
    ;;
esac

if [ "$missing" -ne 0 ]; then
  exit 1
fi

echo "Backend ${mode} environment contract passed."
