#!/bin/bash
# Idempotent: creates certify.records in inji_certify on every compose up.
set -euo pipefail

PGHOST="${PGHOST:-database}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
export PGPASSWORD="${PGPASSWORD:-postgres}"

until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -q; do
  echo "ensure-records: waiting for Postgres at ${PGHOST}:${PGPORT}..."
  sleep 1
done

echo "ensure-records: waiting for inji_certify database..."
until [ "$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -tAc \
  "SELECT 1 FROM pg_database WHERE datname = 'inji_certify'")" = "1" ]; do
  sleep 1
done

echo "ensure-records: ensuring certify.records table exists in inji_certify..."
psql -v ON_ERROR_STOP=1 -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d inji_certify \
  -f /schema/records_table.sql

echo "ensure-records: seeding sample records..."
psql -v ON_ERROR_STOP=1 -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d inji_certify \
  -f /schema/seed_records_sample.sql

echo "ensure-records: ensuring HealthID credential configuration..."
psql -v ON_ERROR_STOP=1 -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d inji_certify \
  -f /schema/healthid_credential_config.sql

echo "ensure-records: done."
