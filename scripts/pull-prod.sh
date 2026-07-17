#!/usr/bin/env bash
#
# Mirror PRODUCTION down to this machine: MongoDB + the uploaded documents.
#
#   ./scripts/pull-prod.sh
#
# Direction is one-way on purpose. Production holds the only copy of the real user
# data — the signups, the plans, the uploaded Aadhaar cards and marksheets. Local is a
# scratchpad you can wipe. There is no push-to-prod counterpart to this script, and
# there should not be: nothing regenerates a student's account.
#
# It keeps a timestamped copy of every dump under backups/, so this doubles as the
# production backup that otherwise does not exist.
#
set -euo pipefail

KEY="${MEDC_PEM:-$HOME/Downloads/my-web-server-key.pem}"
HOST="${MEDC_HOST:-ec2-user@32.236.16.232}"
DB="${MEDC_DB:-medcounsel}"

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(date +%Y-%m-%d_%H%M%S)"
BACKUP_DIR="$REPO/backups/prod-$STAMP"
ARCHIVE="$BACKUP_DIR/mongo.gz"

command -v mongorestore >/dev/null || {
  echo "  mongorestore not found. Install it:  brew install mongodb/brew/mongodb-database-tools"
  exit 1
}
[ -f "$KEY" ] || { echo "  SSH key not found at $KEY (set MEDC_PEM)"; exit 1; }

echo
echo "  pulling production -> this machine"
echo "  host: $HOST"
echo

mkdir -p "$BACKUP_DIR"

# ── 1. Mongo ────────────────────────────────────────────────────────────────
echo "  [1/4] dumping the production database"
ssh -i "$KEY" -o StrictHostKeyChecking=no "$HOST" \
  "mongodump --db=$DB --archive --gzip --quiet" > "$ARCHIVE"
echo "        $(du -h "$ARCHIVE" | cut -f1) -> ${ARCHIVE#$REPO/}"

echo "  [2/4] restoring into localhost:27017/$DB"
# --drop replaces each collection that IS in the dump. It does not touch collections
# that only exist locally, so a stale local-only collection would survive; that is fine
# and safer than --nsInclude gymnastics.
mongorestore --uri="mongodb://localhost:27017" --archive="$ARCHIVE" --gzip --drop --quiet
echo "        restored"

# ── 2. Uploaded documents ───────────────────────────────────────────────────
echo "  [3/4] pulling uploaded documents"
mkdir -p "$REPO/uploads"
rsync -az --delete -e "ssh -i $KEY -o StrictHostKeyChecking=no" \
  "$HOST:/opt/medconsul/uploads/" "$REPO/uploads/"
chmod 700 "$REPO/uploads"
echo "        $(find "$REPO/uploads" -type f | wc -l | tr -d ' ') files (these are real identity documents — the directory is chmod 700 and gitignored)"

# Keep a copy alongside the dump so the backup is self-contained: a Mongo dump without
# the files is a database full of dangling references.
cp -R "$REPO/uploads" "$BACKUP_DIR/uploads"

# ── 3. Verify ───────────────────────────────────────────────────────────────
echo "  [4/4] verifying"
mongosh "$DB" --quiet --eval '
  const rows = ["users","submissions","colleges","closingRanks","fees","announcements",
                "checklistDocs","counsellingQuotas","counsellingSections"]
    .map(c => `${c}=${db[c].countDocuments()}`);
  print("        " + rows.join("  "));
' 2>/dev/null || echo "        (mongosh not available — skipping count check)"

echo
echo "  done. Backup kept at ${BACKUP_DIR#$REPO/}"
echo "  Start the app with: npm run dev"
echo
