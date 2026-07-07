#!/usr/bin/env bash
set -euo pipefail

rm -rf apps/backend/.fc-package
mkdir -p apps/backend/.fc-package
mkdir -p apps/backend/.fc-package/verification

cp -R apps/backend/dist apps/backend/.fc-package/
cp apps/backend/package.json apps/backend/fc-start.sh apps/backend/.fc-package/
cp apps/web/public/XdiIXm3WSq.txt apps/backend/.fc-package/verification/
cp apps/web/public/MP_verify_bDsck6MFYTmV24vd.txt apps/backend/.fc-package/verification/
