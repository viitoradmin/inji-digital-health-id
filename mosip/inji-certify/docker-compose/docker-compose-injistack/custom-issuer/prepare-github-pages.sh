#!/usr/bin/env bash
# Collect did.json + JSON-LD contexts into dist/pages/ for GitHub Pages upload.
# Upload the contents of dist/pages/ to your Pages branch preserving paths:
#   inji-issuer/did.json
#   contexts/student.json
#   contexts/insurance.json
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${SCRIPT_DIR}/dist/pages"
DID_URL="${CERTIFY_DID_URL:-http://localhost:8090/v1/certify/.well-known/did.json}"

mkdir -p "${OUT}/inji-issuer" "${OUT}/contexts"
cp "${SCRIPT_DIR}/dist/contexts/student.json" "${OUT}/contexts/student.json"
cp "${SCRIPT_DIR}/dist/contexts/insurance.json" "${OUT}/contexts/insurance.json"

if curl -sf "${DID_URL}" -o "${OUT}/inji-issuer/did.json"; then
  echo "Fetched DID document from ${DID_URL}"
else
  echo "WARN: Could not fetch DID (is certify running on :8090?)." >&2
  echo "      Start the stack, then re-run: $0" >&2
  exit 1
fi

echo "Ready to publish from: ${OUT}"
echo "Upload to GitHub Pages (gh-pages branch root), then verify:"
grep -E '^BASE_URL|^ISSUER_DID' "${SCRIPT_DIR}/../certify_init_custom.sql" 2>/dev/null | head -2 || true
