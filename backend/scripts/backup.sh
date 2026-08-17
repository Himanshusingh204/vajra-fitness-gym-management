#!/usr/bin/env bash
# Dumps the production Postgres database to a timestamped, gzip-compressed
# SQL file. Run manually (`DATABASE_URL=... ./scripts/backup.sh`) or from the
# scheduled `.github/workflows/backup.yml` workflow.
#
# Requires DATABASE_URL to be the Neon *direct* (non-pooled) connection
# string — pg_dump doesn't work reliably through the pooled endpoint.
#
# Optional: set AWS_S3_BACKUP_BUCKET (plus standard AWS_* credentials) to
# also upload the dump to S3-compatible storage (AWS S3, Cloudflare R2,
# Backblaze B2, etc. all work via the AWS CLI).
#
# Optional: set BACKUP_ENCRYPTION_KEY to also produce a GPG-encrypted copy
# (dump.sql.gz.gpg) alongside the plain dump. The CI workflow uses this to
# avoid ever uploading an unencrypted database dump anywhere a GitHub Actions
# artifact could be reached — see .github/workflows/backup.yml.
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set (use the Neon direct connection string)." >&2
  exit 1
fi

OUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUT_DIR"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP_FILE="$OUT_DIR/vajra-fitness-$TIMESTAMP.sql.gz"

echo "Dumping database to $DUMP_FILE ..."
pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip > "$DUMP_FILE"

SIZE=$(du -h "$DUMP_FILE" | cut -f1)
echo "Backup complete: $DUMP_FILE ($SIZE)"

if [ -n "${AWS_S3_BACKUP_BUCKET:-}" ]; then
  echo "Uploading to s3://$AWS_S3_BACKUP_BUCKET/ ..."
  aws s3 cp "$DUMP_FILE" "s3://$AWS_S3_BACKUP_BUCKET/$(basename "$DUMP_FILE")"
  echo "Upload complete."
fi

if [ -n "${BACKUP_ENCRYPTION_KEY:-}" ]; then
  ENCRYPTED_FILE="$DUMP_FILE.gpg"
  echo "Encrypting to $ENCRYPTED_FILE ..."
  gpg --batch --yes --symmetric --cipher-algo AES256 --passphrase "$BACKUP_ENCRYPTION_KEY" \
    --output "$ENCRYPTED_FILE" "$DUMP_FILE"
  # Never leave the plaintext dump next to its encrypted copy — anything that
  # only picks up *.sql.gz.gpg (e.g. the CI artifact step) must not also find
  # the unencrypted original.
  rm -f "$DUMP_FILE"
  echo "Encrypted backup ready: $ENCRYPTED_FILE"
fi

# Keep only the last 14 local dumps (plain or encrypted) so the backups
# directory doesn't grow unbounded when running this on a persistent machine
# (CI runners are ephemeral, so this is a no-op there).
ls -1t "$OUT_DIR"/vajra-fitness-*.sql.gz* 2>/dev/null | tail -n +15 | xargs -r rm --
