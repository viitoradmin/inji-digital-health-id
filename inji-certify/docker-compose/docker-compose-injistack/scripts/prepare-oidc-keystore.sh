#!/usr/bin/env bash
# One-time (or refresh): place a real PKCS12 at certs/oidckeystore.p12 for Mimoto.
# Password must match oidc_p12_password in docker-compose.yaml (default: xy4gh6swa2i).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERTS_DIR="${SCRIPT_DIR}/../certs"
STORE_PASS="${OIDC_P12_PASSWORD:-xy4gh6swa2i}"
TARGET="${CERTS_DIR}/oidckeystore.p12"

mkdir -p "${CERTS_DIR}"

if [[ ! -w "${CERTS_DIR}" ]]; then
  echo "ERROR: ${CERTS_DIR} is not writable (often root-owned after sudo rm under certs)."
  echo "Fix ownership, then re-run this script:"
  echo "  sudo chown -R \"\$(id -un):\$(id -gn)\" \"${CERTS_DIR}\""
  exit 1
fi

if [[ -d "${TARGET}" ]]; then
  echo "ERROR: ${TARGET} is a directory (invalid). Remove it, then re-run:"
  echo "  sudo rm -rf \"${TARGET}\""
  echo "  $0"
  exit 1
fi

if [[ -f "${TARGET}" ]]; then
  echo "OK: ${TARGET} already exists. Delete it first if you want a new key."
  exit 0
fi

echo "Generating PKCS12 at ${TARGET} (RSA, alias: oidc) ..."
keytool -genkeypair \
  -alias oidc \
  -keyalg RSA \
  -keysize 2048 \
  -storetype PKCS12 \
  -keystore "${TARGET}" \
  -storepass "${STORE_PASS}" \
  -validity 3650 \
  -dname "CN=localhost, OU=Dev, O=InjiLocal, L=Local, ST=NA, C=IN" \
  -noprompt

chmod 644 "${TARGET}" 2>/dev/null || true
echo "Done. Recreate Mimoto (needed if the host path used to be a directory):"
echo "  docker compose rm -f mimoto-service && docker compose up -d mimoto-service"
