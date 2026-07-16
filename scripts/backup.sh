#!/usr/bin/env bash
#
# Automated production backup — runs nightly via cron on the EC2 host.
#
# Dumps the MongoDB (gzip archive) and tars the uploaded documents, keeping the last
# KEEP copies of each with simple rotation. This is the FIRST automated backup this app
# has had; before it, the only mechanism was a manual laptop-pull (scripts/pull-prod.sh).
#
#   Install (on the server):
#     chmod +x /opt/medconsul/scripts/backup.sh
#     ( crontab -l 2>/dev/null; echo "0 2 * * * /opt/medconsul/scripts/backup.sh >> /opt/medconsul/backups/auto/cron.log 2>&1" ) | crontab -
#
# NB: this backup lives on the SAME instance, so it protects against data corruption,
# bad migrations and accidental deletes — NOT against loss of the instance/disk. The
# offsite layer (S3 sync + EBS snapshots) still needs the client's AWS; see the TODO below.
set -euo pipefail

DB="${MEDC_DB:-medcounsel}"
DIR="${MEDC_BACKUP_DIR:-/opt/medconsul/backups/auto}"
UPLOADS="${MEDC_UPLOADS:-/opt/medconsul/uploads}"
KEEP="${MEDC_KEEP:-7}"

mkdir -p "$DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"

mongodump --db="$DB" --archive="$DIR/mongo-$STAMP.gz" --gzip --quiet
[ -d "$UPLOADS" ] && tar czf "$DIR/uploads-$STAMP.tgz" -C "$(dirname "$UPLOADS")" "$(basename "$UPLOADS")" 2>/dev/null || true

# Rotate — keep the newest $KEEP of each kind.
ls -1t "$DIR"/mongo-*.gz    2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -f
ls -1t "$DIR"/uploads-*.tgz 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -f

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)  backup ok  db=$(du -h "$DIR/mongo-$STAMP.gz" | cut -f1)  uploads=$(du -h "$DIR/uploads-$STAMP.tgz" 2>/dev/null | cut -f1 || echo -)" >> "$DIR/backup.log"

# TODO (offsite — needs client AWS): aws s3 sync "$DIR" s3://<private-bucket>/medconsul/ --sse AES256
