#!/usr/bin/env bash
#
# Sanitized dev-database dump — a shareable snapshot for developers (e.g. the interns building
# the platform). It contains all the DOMAIN data the app runs on and EXCLUDES anything with PII
# or secrets, so it is safe to hand out.
#
# This is NOT scripts/backup.sh. backup.sh is a full disaster-recovery dump (users, tokens and
# uploads included) that stays on the server. This one is deliberately stripped for sharing.
#
# Excluded (real accounts / PII / secrets):
#   users           real names, emails, bcrypt password hashes
#   refreshtokens   live session tokens
#   passwordresets  reset tokens
#   submissions     student document-upload metadata (userId, filenames, reviewer)
#
# Recipients recreate their own logins after restoring with `npm run seed` (see RESTORE below).
#
# Usage:
#   ./scripts/dump-dev-db.sh                     # -> ./dist-db/medcounsel-dev-<stamp>.archive.gz
#   MEDC_OUT_DIR=~/Desktop ./scripts/dump-dev-db.sh
#   MONGODB_URI="mongodb://host:27017/medcounsel" ./scripts/dump-dev-db.sh
#
# Restore on the other side (needs mongodb-database-tools):
#   mongorestore --uri="mongodb://localhost:27017/medcounsel" \
#     --archive=medcounsel-dev-<stamp>.archive.gz --gzip --drop
#   # then set SEED_ADMIN_PASSWORD / SEED_STUDENT_PASSWORD in .env and run:  npm run seed
#
set -euo pipefail

URI="${MONGODB_URI:-mongodb://localhost:27017/medcounsel}"
DB="${MEDC_DB:-medcounsel}"
OUT_DIR="${MEDC_OUT_DIR:-$(cd "$(dirname "$0")/.." && pwd)/dist-db}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$OUT_DIR/medcounsel-dev-$STAMP.archive.gz"

# Collections that must never leave the building.
EXCLUDE=(users refreshtokens passwordresets submissions)

command -v mongodump >/dev/null 2>&1 || {
  echo "mongodump not found — install with: brew install mongodb-database-tools" >&2
  exit 1
}

mkdir -p "$OUT_DIR"

excl_args=()
for c in "${EXCLUDE[@]}"; do excl_args+=(--excludeCollection="$c"); done

echo "  dumping $DB (excluding: ${EXCLUDE[*]})"
# --uri carries the db name; mongodump derives $DB from the URI. Pass excludes + archive + gzip.
mongodump --uri="$URI" "${excl_args[@]}" --archive="$OUT" --gzip --quiet

SIZE="$(du -h "$OUT" | cut -f1)"
echo "  wrote  $OUT  ($SIZE)"
echo "  share this file. Recipients restore with:"
echo "    mongorestore --uri=\"$URI\" --archive=\"$(basename "$OUT")\" --gzip --drop"
