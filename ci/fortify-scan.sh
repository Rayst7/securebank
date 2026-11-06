#!/usr/bin/env bash
#
# Wrapper for a licensed Fortify SCA installation.
#
# This script intentionally does not download Fortify or bypass licensing.
# Install Fortify SCA on the Jenkins agent, put `sourceanalyzer` in PATH and
# enable the ENABLE_FORTIFY pipeline parameter.
#
set -euo pipefail

if ! command -v sourceanalyzer >/dev/null 2>&1; then
  echo "Fortify SCA (sourceanalyzer) is not installed or is not in PATH." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_ID="${FORTIFY_BUILD_ID:-securebank}"
REPORT_DIR="${FORTIFY_REPORT_DIR:-${ROOT_DIR}/reports/security}"

mkdir -p "${REPORT_DIR}"

sourceanalyzer -version
sourceanalyzer -b "${BUILD_ID}" -clean
sourceanalyzer -b "${BUILD_ID}" \
  "${ROOT_DIR}/backend/src" \
  "${ROOT_DIR}/frontend/src"
sourceanalyzer -b "${BUILD_ID}" -scan -f "${REPORT_DIR}/securebank.fpr"

echo "Fortify report: ${REPORT_DIR}/securebank.fpr"
