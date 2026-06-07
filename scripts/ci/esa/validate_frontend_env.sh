#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

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

require_group "Aliyun deploy credential" \
  ALIBABA_CLOUD_ACCESS_KEY_ID \
  ALIBABA_CLOUD_ACCESS_KEY_SECRET

require_group "frontend build" \
  VITE_API_URL \
  VITE_TENCENT_LBS_JS_KEY \
  VITE_FRONTEND_COMMIT_HASH

require_group "GitHub Packages registry" \
  NODE_AUTH_TOKEN

if [ "$missing" -ne 0 ]; then
  exit 1
fi

echo "Frontend ESA environment contract passed."
