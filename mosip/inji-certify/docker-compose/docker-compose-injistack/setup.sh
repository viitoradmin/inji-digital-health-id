#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

OIDC_KEYSTORE="${SCRIPT_DIR}/certs/oidckeystore.p12"
OIDC_PASSWORD="${OIDC_P12_PASSWORD:-xy4gh6swa2i}"

mkdir -p certs data/CERTIFY_PKCS12

fix_docker_ownership() {
  local target="$1"
  if [[ ! -w "$target" ]]; then
    echo "Fixing ownership for $target (created by Docker as root)"
    docker run --rm -v "${target}:/target" alpine chown -R "$(id -u):$(id -g)" /target
  fi
}

fix_docker_ownership "${SCRIPT_DIR}/certs"
fix_docker_ownership "${SCRIPT_DIR}/data/CERTIFY_PKCS12"

# Docker creates a directory when bind-mounting a missing file path.
if [[ -d "$OIDC_KEYSTORE" ]]; then
  echo "Removing invalid directory at certs/oidckeystore.p12"
  rm -rf "$OIDC_KEYSTORE"
fi

if [[ ! -f "$OIDC_KEYSTORE" ]]; then
  if ! command -v keytool >/dev/null 2>&1; then
    echo "keytool not found. Install a JDK, then re-run ./setup.sh"
    exit 1
  fi

  echo "Generating local dev keystore at certs/oidckeystore.p12"
  keytool -genkeypair \
    -alias mpartner-default-mimoto \
    -keyalg RSA \
    -keysize 2048 \
    -storetype PKCS12 \
    -keystore "$OIDC_KEYSTORE" \
    -storepass "$OIDC_PASSWORD" \
    -keypass "$OIDC_PASSWORD" \
    -dname "CN=localhost, OU=Inji, O=MOSIP, L=Bangalore, ST=KA, C=IN" \
    -validity 3650
fi

echo "Setup complete."
