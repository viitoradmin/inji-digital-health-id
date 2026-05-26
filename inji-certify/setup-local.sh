#!/usr/bin/env bash
# Local development setup for inji-certify
# Run this once before starting the service for the first time.
# Re-running is safe: DB creation is idempotent, keystore is skipped if present.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_SCRIPTS="$PROJECT_ROOT/db_scripts/inji_certify"
SERVICE_DIR="$PROJECT_ROOT/certify-service"

# ── 1. Configuration ──────────────────────────────────────────────────────────
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_PASS="${DB_PASS:-postgres}"
DB_NAME="inji_certify"
KEYSTORE_PATH="$SERVICE_DIR/local.p12"
KEYSTORE_PASS="local"

export PGPASSWORD="$DB_PASS"

echo "==> [1/5] Checking PostgreSQL connection at $DB_HOST:$DB_PORT ..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
  echo "ERROR: Cannot connect to PostgreSQL as user '$DB_USER' at $DB_HOST:$DB_PORT"
  echo "       Check DB_PASS env var or pg_hba.conf. Default password is 'postgres'."
  echo "       To reset: sudo -u postgres psql -c \"ALTER USER postgres WITH PASSWORD 'postgres';\""
  exit 1
fi
echo "    Connection OK."

# ── 2. Create database and certify schema ─────────────────────────────────────
echo "==> [2/5] Creating database '$DB_NAME' and schema 'certify' ..."

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tc \
  "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME';" | grep -q 1 || \
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
  "CREATE DATABASE $DB_NAME ENCODING='UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8' TEMPLATE=template0 OWNER=$DB_USER;"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
  "CREATE SCHEMA IF NOT EXISTS certify AUTHORIZATION $DB_USER;"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
  "ALTER DATABASE $DB_NAME SET search_path TO certify,pg_catalog,public;"

echo "    Done."

# ── 3. Run DDL (create tables) ────────────────────────────────────────────────
echo "==> [3/5] Running DDL scripts ..."

DDL_DIR="$DB_SCRIPTS/ddl"

run_ddl() {
  local file="$1"
  local tbl
  tbl=$(basename "$file" .sql | sed 's/certify-//')
  if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
       -c "SET search_path TO certify; SELECT to_regclass('certify.$tbl');" 2>/dev/null | grep -q "$tbl"; then
    echo "    SKIP (already exists): $tbl"
  else
    echo "    Creating table: $tbl"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      -v ON_ERROR_STOP=0 \
      -c "SET search_path TO certify;" \
      -f "$file"
  fi
}

# Run in dependency order (key tables first)
run_ddl "$DDL_DIR/certify-key_alias.sql"
run_ddl "$DDL_DIR/certify-key_policy_def.sql"
run_ddl "$DDL_DIR/certify-key_store.sql"
run_ddl "$DDL_DIR/certify-ca_cert_store.sql"
run_ddl "$DDL_DIR/certify-rendering_template.sql"
run_ddl "$DDL_DIR/certify-credential_config.sql"
run_ddl "$DDL_DIR/certify-status_list_credential.sql"
run_ddl "$DDL_DIR/certify-ledger.sql"
run_ddl "$DDL_DIR/certify-credential_status_transaction.sql"
run_ddl "$DDL_DIR/certify-status_list_available_indices.sql"
run_ddl "$DDL_DIR/certify-shedlock.sql"
run_ddl "$DDL_DIR/certify-iar_session.sql"

echo "    Done."

# ── 4. Load seed data (DML) ───────────────────────────────────────────────────
echo "==> [4/5] Loading seed data ..."

ROW_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SET search_path TO certify; SELECT COUNT(*) FROM key_policy_def;" 2>/dev/null || echo "0")

if [ "$ROW_COUNT" -gt "0" ]; then
  echo "    SKIP: key_policy_def already has $ROW_COUNT rows."
else
  # \COPY requires psql to run from the directory containing the CSV
  pushd "$DB_SCRIPTS" > /dev/null
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -c "SET search_path TO certify;" \
    -c "\COPY certify.key_policy_def (APP_ID,KEY_VALIDITY_DURATION,PRE_EXPIRE_DAYS,ACCESS_ALLOWED,IS_ACTIVE,CR_BY,CR_DTIMES) FROM './dml/certify-key_policy_def.csv' DELIMITER ',' CSV HEADER;"
  popd > /dev/null
  echo "    Seed data loaded."
fi

# ── 5. Generate local PKCS12 keystore ─────────────────────────────────────────
echo "==> [5/5] Setting up PKCS12 keystore at $KEYSTORE_PATH ..."

if [ -f "$KEYSTORE_PATH" ]; then
  echo "    SKIP: local.p12 already exists."
else
  keytool -genkeypair \
    -alias certify \
    -keyalg RSA \
    -keysize 2048 \
    -validity 3650 \
    -keystore "$KEYSTORE_PATH" \
    -storetype PKCS12 \
    -storepass "$KEYSTORE_PASS" \
    -dname "CN=www.example.com, OU=EXAMPLE-CENTER, O=IIITB, L=BANGALORE, ST=KA, C=IN" \
    -noprompt
  echo "    Keystore created: $KEYSTORE_PATH"
fi

unset PGPASSWORD

echo ""
echo "==> Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Build:  cd '$PROJECT_ROOT' && mvn clean install -DskipTests -pl certify-service -am"
echo "  2. Run:    cd '$PROJECT_ROOT' && mvn spring-boot:run -pl certify-service"
echo "  3. Open:   http://localhost:8090/v1/certify/swagger-ui/index.html"
echo ""
